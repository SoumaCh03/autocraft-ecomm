import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import BASE_URL from '../utils/api';
import { useAuth } from './AuthContext';
import { socketConnect, socketDisconnect, on, off, emit, isConnected } from '../utils/socketClient';

const NotificationContext = createContext();
const API = BASE_URL;

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const receivedTokensRef = useRef(new Set());
  const pollingIntervalRef = useRef(null);
  const socketInitializedRef = useRef(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data } = await axios.get(`${API}/notifications?limit=50`, {
        withCredentials: true,
      });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.log('Fetch notifications error:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`, {}, {
        withCredentials: true,
      });
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.log('Mark as read error:', error.message);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API}/notifications/read/all`, {}, {
        withCredentials: true,
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.log('Mark all as read error:', error.message);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API}/notifications/${notificationId}`, {
        withCredentials: true,
      });
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.log('Delete notification error:', error.message);
    }
  };

  // Handle incoming socket notification
  const handleNotificationUpdate = useCallback((data) => {
    const { deduplicationToken, notification } = data;

    // Duplicate prevention
    if (receivedTokensRef.current.has(deduplicationToken)) {
      if (import.meta.env.DEV) {
        console.log('[Socket] Ignoring duplicate notification:', deduplicationToken);
      }
      return;
    }

    receivedTokensRef.current.add(deduplicationToken);

    // Keep set size manageable (max 1000 tokens)
    if (receivedTokensRef.current.size > 1000) {
      const tokensArray = Array.from(receivedTokensRef.current);
      tokensArray.slice(0, 500).forEach(token => receivedTokensRef.current.delete(token));
    }

    // Add notification to state
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);

    if (import.meta.env.DEV) {
      console.log('[Socket] Notification received:', notification.type);
    }

    // Send acknowledgment back to server
    emit('notification:ack', {
      deduplicationToken,
      receivedAt: new Date().toISOString(),
    });
  }, []);

  // Initialize socket connection
  useEffect(() => {
    if (!user || socketInitializedRef.current) return;

    socketInitializedRef.current = true;

    // Connect socket
    const socket = socketConnect(user);

    if (socket) {
      const handleConnect = () => {
        setSocketConnected(true);
        if (import.meta.env.DEV) {
          console.log('[Socket] Connected in context');
        }
      };

      const handleDisconnect = () => {
        setSocketConnected(false);
        if (import.meta.env.DEV) {
          console.log('[Socket] Disconnected in context');
        }
      };

      on('connect', handleConnect);
      on('disconnect', handleDisconnect);
      on('notification:update', handleNotificationUpdate);

      // Initial fetch
      fetchNotifications();

      return () => {
        off('connect', handleConnect);
        off('disconnect', handleDisconnect);
        off('notification:update', handleNotificationUpdate);

        socketDisconnect();
        socketInitializedRef.current = false;
      };
    } else {
      // Socket connection failed, fall back to polling
      if (import.meta.env.DEV) {
        console.warn('[Socket] Connection failed, falling back to polling');
      }
      setSocketConnected(false);
      fetchNotifications();
    }
  }, [user, fetchNotifications, handleNotificationUpdate]);

  // Set up polling as fallback or backup
  useEffect(() => {
    if (!user) return;

    // If socket is not connected, use polling
    if (!socketConnected) {
      // Fetch immediately if not already connected
      if (!pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(fetchNotifications, 60000); // 60s polling when not using socket
      }
    } else {
      // Clear polling when socket is connected
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user, socketConnected, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        socketConnected,
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
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

