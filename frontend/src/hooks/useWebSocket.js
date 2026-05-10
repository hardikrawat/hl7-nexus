import { useEffect, useRef, useCallback } from 'react';
import { useNexusStore } from '../store/nexusStore';
import { API } from '../config/api';

/**
 * H-02: WebSocket hook with exponential backoff reconnection.
 * Automatically reconnects on disconnect with delays: 1s, 2s, 4s, 8s... max 30s
 */
export function useWebSocket(url = API.WS_EVENTBUS) {
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectDelay = useRef(1000);
  const isUnmounting = useRef(false);
  const addEvent = useNexusStore((state) => state.addEvent);

  const connect = useCallback(() => {
    if (isUnmounting.current) return;

    try {
      ws.current = new WebSocket(url);
    } catch (e) {
      // If WebSocket constructor fails, schedule reconnect
      scheduleReconnect();
      return;
    }

    ws.current.onopen = () => {
      // Reset backoff on successful connection
      reconnectDelay.current = 1000;

      addEvent({
        type: 'EventType.WS_CONNECTED',
        timestamp: new Date().toISOString(),
        engine: 'system',
        detail: 'Connected to Helix System Event Bus',
        severity: 'INFO'
      });
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Server now provides timestamps (C-07), but fallback just in case
        if (!data.timestamp) data.timestamp = new Date().toISOString();
        addEvent(data);
      } catch (err) {
        console.error("Failed to parse WS message", err);
      }
    };

    ws.current.onclose = () => {
      addEvent({
        type: 'EventType.WS_DISCONNECTED',
        timestamp: new Date().toISOString(),
        engine: 'system',
        detail: 'Lost connection to Event Bus',
        severity: 'WARNING'
      });

      // Attempt reconnection unless component is unmounting
      if (!isUnmounting.current) {
        scheduleReconnect();
      }
    };

    ws.current.onerror = () => {
      // onclose will fire after onerror, which handles reconnection
    };
  }, [url, addEvent]);

  const scheduleReconnect = useCallback(() => {
    if (isUnmounting.current) return;

    const delay = reconnectDelay.current;

    addEvent({
      type: 'EventType.WS_RECONNECTING',
      timestamp: new Date().toISOString(),
      engine: 'system',
      detail: `Reconnecting in ${delay / 1000}s...`,
      severity: 'INFO'
    });

    reconnectTimer.current = setTimeout(() => {
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
      reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
      connect();
    }, delay);
  }, [connect, addEvent]);

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
