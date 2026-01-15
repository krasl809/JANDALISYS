import { useState, useEffect, useRef } from 'react';

interface PresenceUpdate {
  type: 'presence_update';
  contract_id: string;
  users: string[];
}

export const usePresence = (contractId: string | undefined, userName: string | undefined) => {
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountingRef = useRef(false);

  useEffect(() => {
    isUnmountingRef.current = false;
    if (!contractId || !userName) return;

    const connect = () => {
      if (isUnmountingRef.current) return;
      
      // Close existing socket if any
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.close();
        socketRef.current = null;
      }

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      let wsUrl: string;
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      
      if (import.meta.env.DEV) {
        wsUrl = `ws://${window.location.hostname}:8000/ws`;
      } else if (apiBaseUrl.startsWith('http')) {
        wsUrl = apiBaseUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '/ws');
      } else {
        wsUrl = `${protocol}//${host}/ws`;
      }

      console.log(`🔌 Presence WebSocket connecting to: ${wsUrl}`);
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        if (isUnmountingRef.current) {
          socket.close();
          return;
        }
        console.log('✅ Presence WebSocket connected');
        reconnectAttemptsRef.current = 0;

        socket.send(JSON.stringify({
          type: 'presence',
          action: 'enter',
          contract_id: contractId,
          user_name: userName
        }));

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      socket.onmessage = (event) => {
        if (isUnmountingRef.current) return;
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'presence_update' && data.contract_id === contractId) {
            setActiveUsers(data.users.filter((u: string) => u !== userName));
          }
        } catch (e) {}
      };

      socket.onclose = (event) => {
        socketRef.current = null;
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        if (!isUnmountingRef.current) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`🔄 Presence WebSocket closed (code=${event.code}). Reconnecting in ${delay/1000}s...`);
          
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      socket.onerror = (err) => {
        if (!isUnmountingRef.current) {
          console.error('❌ Presence WebSocket error', err);
        }
      };
    };

    connect();

    return () => {
      isUnmountingRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (socketRef.current) {
        const socket = socketRef.current;
        socketRef.current = null;
        
        if (socket.readyState === WebSocket.OPEN) {
          try {
            socket.send(JSON.stringify({
              type: 'presence',
              action: 'leave',
              contract_id: contractId,
              user_name: userName
            }));
          } catch (e) {}
        }
        
        socket.onclose = null;
        socket.onerror = null;
        if (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
          socket.close();
        }
      }
    };
  }, [contractId, userName]);

  return activeUsers;
};
