"use client";

import { createContext, useContext, useState, useEffect, ReactNode, startTransition } from "react";
import { AUTH_EXPIRED_EVENT, api, clearStoredAuth, getStoredAccessToken, setStoredAccessToken } from "../lib/api";
import { User } from "../lib/types";

interface AuthContextType {
  user: User | null;
  login: (user: User, token?: string) => void;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const handleAuthExpired = () => {
      startTransition(() => {
        setUser(null);
        setIsLoading(false);
      });
    };

    async function bootstrapAuth() {
      const savedUser = localStorage.getItem("user");
      const token = getStoredAccessToken();

      if (!savedUser || !token) {
        clearStoredAuth();
        if (!cancelled) {
          startTransition(() => {
            setUser(null);
            setIsLoading(false);
          });
        }
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser) as User;
        const me = await api.me() as User;
        if (cancelled) return;
        localStorage.setItem("user", JSON.stringify(me));
        startTransition(() => {
          setUser(me ?? parsedUser);
          setIsLoading(false);
        });
      } catch {
        clearStoredAuth();
        if (!cancelled) {
          startTransition(() => {
            setUser(null);
            setIsLoading(false);
          });
        }
      }
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    void bootstrapAuth();

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const login = (u: User, token?: string) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
    if (token) setStoredAccessToken(token);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Continue with local logout even if the server call fails
    }
    setUser(null);
    localStorage.removeItem("user");
    setStoredAccessToken(null);
  };

  const updateUser = (u: User) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
