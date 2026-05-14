import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useNexusStore } from '../store/nexusStore';
import { useAuthStore } from '../store/authStore';
import { API } from '../config/api';

/**
 * WebSocket to the event bus with exponential backoff.
 * Server requires ?token= JWT from login.
 */
export function useWebSocket() {
  const token = useAuthStore((s) => s.token);
  const wsUrl = useMemo(
    () =>
      token
        ? `${API.WS_EVENTBUS}?token=${encodeURIComponent(token)}`
        : API.WS_EVENTBUS,
    [token]
  );

  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const isUnmounting = useRef(false);
  const addEvent = useNexusStore((state) => state.addEvent);

  const connect = useCallback(() => {
    if (isUnmounting.current) return;

    const scheduleReconnect = () => {
      if (isUnmounting.current) return;
      const delay = reconnectDelay.current;
      addEvent({
        type: 'EventType.WS_RECONNECTING',
        timestamp: new Date().toISOString(),
        engine: 'system',
        detail: `Reconnecting in ${delay / 1000}s...`,
        severity: 'INFO',
      });
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, delay);
    };

    try {
      ws.current = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.current.onopen = () => {
      reconnectDelay.current = 1000;
      addEvent({
        type: 'EventType.WS_CONNECTED',
        timestamp: new Date().toISOString(),
        engine: 'system',
        detail: 'Connected to Helix System Event Bus',
        severity: 'INFO',
      });
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (!data.timestamp) data.timestamp = new Date().toISOString();
        addEvent(data);
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.current.onclose = () => {
      addEvent({
        type: 'EventType.WS_DISCONNECTED',
        timestamp: new Date().toISOString(),
        engine: 'system',
        detail: 'Lost connection to Event Bus',
        severity: 'WARNING',
      });
      if (!isUnmounting.current) {
        scheduleReconnect();
      }
    };

    ws.current.onerror = () => {};
  }, [wsUrl, addEvent]);

  useEffect(() => {
    isUnmounting.current = false;
    connect();

    return () => {
      isUnmounting.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return ws.current;
}
