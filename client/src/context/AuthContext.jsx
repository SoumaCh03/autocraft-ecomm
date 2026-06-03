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
    } catch (error) {
      // 401 is expected when user is not logged in
      if (error.response?.status !== 401) {
        console.error('[Auth] Failed to fetch current user:', error);
      }

      setUser(null);
      setToken(null);
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
    return data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    setToken(null);
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    setUser(data.user);
    setToken(data.token);
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
