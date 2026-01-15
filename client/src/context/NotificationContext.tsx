import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import api from '../services/api';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  contract_id?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (signal?: AbortSignal) => {
    const token = localStorage.getItem('access_token');
    if (!user?.id || !token) {
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.get('notifications/', { signal });
      setNotifications(response.data);
      
      const countResponse = await api.get('notifications/unread-count', { signal });
      setUnreadCount(countResponse.data.unread_count);
    } catch (error: any) {
      if (axios.isCancel(error) || error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        return;
      }
      
      if (error.response?.status === 401) {
        return; // api.ts will handle redirect
      }
      
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`notifications/${id}`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`notifications/${id}`);
      setNotifications(prev => {
        const notification = prev.find(n => n.id === id);
        if (notification && !notification.is_read) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        return prev.filter(n => n.id !== id);
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout;
    let heartbeatInterval: NodeJS.Timeout | undefined;
    let reconnectAttempts = 0;
    const maxReconnectDelay = 30000; // Max 30 seconds

    const controller = new AbortController();

    const connectWebSocket = () => {
      const token = localStorage.getItem('access_token');
      if (!user?.id || !token) {
        return;
      }

      // Close existing socket if any
      if (socket) {
        try {
          socket.onclose = null;
          socket.onerror = null;
          socket.close();
        } catch (e) {}
      }

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      
      // Use the actual backend URL if defined in environment, otherwise fallback to current host
      let wsUrl: string;
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      
      if (apiBaseUrl.startsWith('http')) {
        // If API_URL is a full URL (e.g. http://192.168.1.10:8000/api)
        // Convert http(s) to ws(s) and replace /api with /ws
        wsUrl = apiBaseUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '/ws');
      } else {
        // Fallback to relative path which works via Vite proxy or Nginx
        wsUrl = `${protocol}//${host}/ws`;
      }
      
      if (import.meta.env.DEV) {
        console.log(`🔌 Notification WebSocket connecting to: ${wsUrl} (Attempt ${reconnectAttempts + 1})`);
      }
      
      try {
        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'notification') {
              const newNotif = message.data;
              if (newNotif.user_id === user.id) {
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);

                if ('Notification' in window && Notification.permission === 'granted') {
                  new Notification(newNotif.title, {
                    body: newNotif.message,
                    icon: '/favicon.ico'
                  });
                }
              }
            }
          } catch (error) {
            // Ignore non-JSON
          }
        };

        socket.onopen = () => {
          if (import.meta.env.DEV) console.log('✅ Notification WebSocket connected');
          reconnectAttempts = 0; // Reset attempts on successful connection

          // Start heartbeat
          heartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
        };

        socket.onerror = () => {
          // Only log error if not closing normally
          if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
            if (import.meta.env.DEV) console.error('❌ Notification WebSocket error');
          }
        };

        socket.onclose = (event) => {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = undefined;
          }

          if (event.code !== 1000 && user?.id && localStorage.getItem('access_token')) {
            // Exponential backoff for reconnection
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
            reconnectAttempts++;
            
            if (import.meta.env.DEV) {
              console.log(`🔄 Notification WebSocket closed (code: ${event.code}). Reconnecting in ${delay/1000}s...`);
            }
            
            clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(connectWebSocket, delay);
          }
        };
      } catch (e) {
        console.error('Failed to create WebSocket instance:', e);
      }
    };

    if (user?.id) {
      fetchNotifications(controller.signal);
      connectWebSocket();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }

    return () => {
      controller.abort();
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [user?.id, fetchNotifications]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
