import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

interface TelemetryPoint {
  deviceId: string;
  deviceName: string;
  values: Record<string, number>;
  timestamp: string;
  messageCount: number;
}

interface WebSocketContextType {
  subscribe: (deviceId: string, cb: (msg: TelemetryPoint) => void) => () => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

const WS_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080') + '/ws';

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientRef  = useRef<Client | null>(null);
  const handlersRef = useRef<Map<string, Set<(msg: TelemetryPoint) => void>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      onConnect: () => {
        setIsConnected(true);
        // Re-subscribe all registered handlers on reconnect
        handlersRef.current.forEach((_, deviceId) => {
          client.subscribe(`/topic/device/${deviceId}`, (frame) => {
            const msg: TelemetryPoint = JSON.parse(frame.body);
            handlersRef.current.get(deviceId)?.forEach(cb => cb(msg));
          });
        });
      },
      onDisconnect: () => setIsConnected(false),
      onStompError: (frame) => console.error('STOMP error:', frame),
    });

    client.activate();
    clientRef.current = client;

    return () => { client.deactivate(); };
  }, []);

  const subscribe = (deviceId: string, cb: (msg: TelemetryPoint) => void) => {
    if (!handlersRef.current.has(deviceId)) {
      handlersRef.current.set(deviceId, new Set());
      // Subscribe on the STOMP client if already connected
      if (clientRef.current?.connected) {
        clientRef.current.subscribe(`/topic/device/${deviceId}`, (frame) => {
          const msg: TelemetryPoint = JSON.parse(frame.body);
          handlersRef.current.get(deviceId)?.forEach(fn => fn(msg));
        });
      }
    }
    handlersRef.current.get(deviceId)!.add(cb);
    return () => { handlersRef.current.get(deviceId)?.delete(cb); };
  };

  return (
    <WebSocketContext.Provider value={{ subscribe, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider');
  return ctx;
};
