import { useEffect, useMemo, useRef } from 'react';
import { useNexusStore } from '../store/nexusStore';
import { useAuthStore } from '../store/authStore';
import { API } from '../config/api';

const KEEPALIVE_INTERVAL_MS = 25000;
const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * WebSocket to the event bus with exponential backoff.
 * Server requires ?token= JWT from login.
 */
export function useWebSocket() {
  const token = useAuthStore((s) => s.token);
  const logout = useAuthStore((s) => s.logout);
  const wsUrl = useMemo(
    () =>
      token
        ? `${API.WS_EVENTBUS}?token=${encodeURIComponent(token)}`
        : API.WS_EVENTBUS,
    [token]
  );

  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const keepaliveTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const connectionGeneration = useRef(0);
  const addEvent = useNexusStore((state) => state.addEvent);

  useEffect(() => {
    const clearTimers = () => {
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (keepaliveTimer.current) {
        clearInterval(keepaliveTimer.current);
        keepaliveTimer.current = null;
      }
    };

    const closeCurrentSocket = () => {
      if (!ws.current) return;
      const socket = ws.current;
      ws.current = null;
      socket.onopen = null;
      socket.onmessage = null;
      socket.onclose = null;
      socket.onerror = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close(1000, 'client lifecycle change');
      }
    };

    clearTimers();

    if (!token) {
      connectionGeneration.current += 1;
      closeCurrentSocket();
      reconnectDelay.current = 1000;
      return undefined;
    }

    const generation = connectionGeneration.current + 1;
    connectionGeneration.current = generation;
    closeCurrentSocket();

    const isCurrentConnection = (socket) => (
      connectionGeneration.current === generation && ws.current === socket
    );

    const scheduleReconnect = (connectAgain) => {
      if (connectionGeneration.current !== generation || !token || reconnectTimer.current) return;
      const delay = reconnectDelay.current;
      addEvent({
        type: 'EventType.WS_RECONNECTING',
        timestamp: new Date().toISOString(),
        engine: 'system',
        detail: `Reconnecting in ${delay / 1000}s...`,
        severity: 'INFO',
      });
      reconnectTimer.current = setTimeout(() => {
        reconnectTimer.current = null;
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY_MS);
        connectAgain();
      }, delay);
    };

    const connect = () => {
      if (connectionGeneration.current !== generation || !token) return;
      if (
        ws.current
        && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      let socket;
      try {
        socket = new WebSocket(wsUrl);
      } catch {
        scheduleReconnect(connect);
        return;
      }

      ws.current = socket;

      socket.onopen = () => {
        if (!isCurrentConnection(socket)) {
          socket.close(1000, 'stale connection');
          return;
        }

        reconnectDelay.current = 1000;
        addEvent({
          type: 'EventType.WS_CONNECTED',
          timestamp: new Date().toISOString(),
          engine: 'system',
          detail: 'Connected to Helix System Event Bus',
          severity: 'INFO',
        });

        if (keepaliveTimer.current) clearInterval(keepaliveTimer.current);
        keepaliveTimer.current = setInterval(() => {
          if (!isCurrentConnection(socket) || socket.readyState !== WebSocket.OPEN) return;
          socket.send('ping');
        }, KEEPALIVE_INTERVAL_MS);
      };

      socket.onmessage = (event) => {
        if (!isCurrentConnection(socket)) return;
        try {
          const data = JSON.parse(event.data);
          if (!data.timestamp) data.timestamp = new Date().toISOString();
          addEvent(data);
        } catch (err) {
          console.error('Failed to parse WS message', err);
        }
      };

      socket.onclose = (event) => {
        if (!isCurrentConnection(socket)) return;
        ws.current = null;
        if (keepaliveTimer.current) {
          clearInterval(keepaliveTimer.current);
          keepaliveTimer.current = null;
        }

        if (event.code === 1000) return;

        if (event.code === 1008) {
          addEvent({
            type: 'EventType.WS_AUTH_REJECTED',
            timestamp: new Date().toISOString(),
            engine: 'system',
            detail: 'Event Bus authentication expired. Please sign in again.',
            severity: 'WARNING',
          });
          logout();
          return;
        }

        addEvent({
          type: 'EventType.WS_DISCONNECTED',
          timestamp: new Date().toISOString(),
          engine: 'system',
          detail: 'Lost connection to Event Bus',
          severity: 'WARNING',
        });
        scheduleReconnect(connect);
      };

      socket.onerror = () => {};
    };

    connect();

    return () => {
      if (connectionGeneration.current === generation) {
        connectionGeneration.current += 1;
      }
      clearTimers();
      closeCurrentSocket();
    };
  }, [addEvent, logout, token, wsUrl]);

  return ws.current;
}
