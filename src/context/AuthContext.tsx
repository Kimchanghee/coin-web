import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user in localStorage on initial load
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  const login = async (email: string, pass: string): Promise<void> => {
    // This is a mock login. In a real app, you'd call an API.
    if (email && pass) {
      const userData = { email };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } else {
        throw new Error("Invalid email or password");
    }
  };

  const signup = async (email: string, pass: string): Promise<void> => {
    // This is a mock signup.
    if (email && pass) {
        // In a real app, you would register the user via an API call.
        // For this mock, we'll just log it and prepare for login.
        console.log(`Signed up with ${email}`);
    } else {
        throw new Error("Invalid email or password");
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = { user, loading, login, signup, logout };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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