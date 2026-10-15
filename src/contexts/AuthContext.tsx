import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  isLoading: boolean;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUser = (u: any): User | null => {
  if (!u) return null;
  const association_id = u.association_id ?? u.associationId;
  const association_name = u.association_name ?? u.associationName;
  const avatar_url = u.avatar_url ?? u.avatarUrl;
  return {
    ...u,
    association_id: association_id != null ? Number(association_id) : undefined,
    associationId: association_id != null ? Number(association_id) : undefined,
    association_name,
    associationName: association_name,
    avatar_url,
    avatarUrl: avatar_url,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('association_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        const normalized = normalizeUser(parsed);
        setUser(normalized);
        if (normalized) {
          localStorage.setItem('association_user', JSON.stringify(normalized));
        }
      } catch (e) {
        console.error("Failed to parse saved user:", e);
        localStorage.removeItem('association_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    const normalized = normalizeUser(userData) || userData;
    setUser(normalized);
    localStorage.setItem('association_user', JSON.stringify(normalized));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('association_user');
  };

  const authFetch = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (user?.token) {
      headers.set('Authorization', `Bearer ${user.token}`);
    }
    const assoId = user?.association_id ?? (user as any)?.associationId;
    if (assoId != null) {
      headers.set('X-Association-Id', assoId.toString());
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      logout();
      window.location.href = '/login';
    }

    return response;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
