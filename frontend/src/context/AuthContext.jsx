import { createContext, useContext, useState, useEffect } from 'react';
import api from '../axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [contextStr, setContextStr] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUser = () => {
    return api.get('/profile')
      .then(res => {
        setUser(res.data.user || res.data); // depending on how profile returns
        setRole(res.data.role);
        setContextStr(res.data.context || '');
      })
      .catch(() => {
        setUser(null);
        setRole(null);
        setContextStr('');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = (data) => {
    setUser(data.user);
    setRole(data.role);
    setContextStr(data.context || '');
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setRole(null);
    setContextStr('');
  };

  return (
    <AuthContext.Provider value={{ user, role, context: contextStr, loading, login, logout, setRole, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
