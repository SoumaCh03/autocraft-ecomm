import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await api.get('/auth/me');

        setUser(data.user);
        setToken(data.token);
        if (data.user) {
          localStorage.setItem('autocraft_offline_user', JSON.stringify(data.user));
          localStorage.setItem('autocraft_offline_token', data.token || '');
        } else {
          localStorage.removeItem('autocraft_offline_user');
          localStorage.removeItem('autocraft_offline_token');
        }
      } catch (error) {
        const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error';
        if (isNetworkError) {
          const cachedUser = localStorage.getItem('autocraft_offline_user');
          const cachedToken = localStorage.getItem('autocraft_offline_token');
          if (cachedUser) {
            console.log('[Auth] Network unreachable. Recovered cached session.');
            setUser(JSON.parse(cachedUser));
            setToken(cachedToken || null);
            setLoading(false);
            return;
          }
        }

        if (error.response?.status !== 401) {
          console.error('[Auth] Failed to fetch current user:', error);
        }

        setUser(null);
        setToken(null);
        localStorage.removeItem('autocraft_offline_user');
        localStorage.removeItem('autocraft_offline_token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setUser(data.user);
    setToken(data.token);
    if (data.user) {
      localStorage.setItem('autocraft_offline_user', JSON.stringify(data.user));
      localStorage.setItem('autocraft_offline_token', data.token || '');
    }
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('[Auth] Server logout failed (offline context):', err.message);
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('autocraft_offline_user');
    localStorage.removeItem('autocraft_offline_token');
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    setUser(data.user);
    setToken(data.token);
    if (data.user) {
      localStorage.setItem('autocraft_offline_user', JSON.stringify(data.user));
      localStorage.setItem('autocraft_offline_token', data.token || '');
    }
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, register, setUser, setToken, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export { api };
