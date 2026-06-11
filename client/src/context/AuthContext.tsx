import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi } from '@/api/auth.api';
import type { User, LoginPayload, RegisterPayload, Role } from '@/types';

// ----------------------------------------------------------------
// Context shape
// ----------------------------------------------------------------
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: Role | Role[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ----------------------------------------------------------------
// Provider
// ----------------------------------------------------------------
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra session khi app load
  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await authApi.getMe();
        setUser(data.data);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const { data } = await authApi.login(payload);
    const { accessToken, refreshToken, user: loggedUser } = data.data;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(loggedUser);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    // Chỉ gọi API để tạo user và gửi email OTP, không lưu token đăng nhập ở đây
    await authApi.register(payload);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // silent
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  }, []);

  const hasRole = useCallback(
    (role: Role | Role[]) => {
      if (!user) return false;
      return Array.isArray(role) ? role.includes(user.role) : user.role === role;
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      hasRole,
    }),
    [user, isLoading, login, register, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ----------------------------------------------------------------
// Hook
// ----------------------------------------------------------------
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
