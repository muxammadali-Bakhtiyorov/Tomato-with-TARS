import { createContext, useContext, type ReactNode } from 'react';

interface AuthGateProps {
  children: ReactNode;
}

interface AuthUser {
  id: string;
  email?: string | null;
}

interface AuthContextValue {
  user: AuthUser;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthGate.');
  return value;
}

export function AuthGate({ children }: AuthGateProps) {
  const fallbackUser: AuthUser = {
    id: 'local-user',
    email: 'local@tomatoes-with-tars',
  };

  const value: AuthContextValue = {
    user: fallbackUser,
    signOut: async () => {},
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
