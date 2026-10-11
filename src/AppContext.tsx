import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AppState, Slide, Settings } from './types';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  appState: AppState | null;
  fetchAppState: () => Promise<void>;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('showpay_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return localStorage.getItem('showpay_admin') === 'true';
  });
  const [appState, setAppState] = useState<AppState | null>(null);

  useEffect(() => {
    if (user) {
      localStorage.setItem('showpay_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('showpay_user');
    }
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      localStorage.setItem('showpay_admin', 'true');
    } else {
      localStorage.removeItem('showpay_admin');
    }
  }, [isAdmin]);

  const fetchAppState = async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setAppState(data);
      }
    } catch (e) {
      console.error('Failed to fetch app state', e);
    }
  };

  useEffect(() => {
    fetchAppState();
    // Refresh state periodically to sync between tabs/devices
    const interval = setInterval(fetchAppState, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{ user, setUser, appState, fetchAppState, isAdmin, setIsAdmin }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
