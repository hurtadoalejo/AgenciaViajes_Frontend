import { useState, type ReactNode } from 'react';
import type { AuthUser } from '../types';
import { AuthContext } from '../hooks/authContextInstance';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('usuario');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.idUsuario === 'number') {
        return parsed as AuthUser;
      }
      localStorage.removeItem('usuario');
      return null;
    } catch {
      localStorage.removeItem('usuario');
      return null;
    }
  });

  const login = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem('usuario', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('usuario');
  };

  const updateUserSession = (partial: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...partial };
      localStorage.setItem('usuario', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUserSession }}>
      {children}
    </AuthContext.Provider>
  );
}