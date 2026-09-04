import React, { createContext, useContext, useState } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  role?: string;
}

interface Tenant {
  id: string;
  name: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  tenant: Tenant | null;
  login: (token: string, user: User, tenant?: Tenant) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(
    localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null
  );
  const [tenant, setTenant] = useState<Tenant | null>(
    localStorage.getItem('tenant') ? JSON.parse(localStorage.getItem('tenant')!) : null
  );

  const login = (newToken: string, newUser: User, newTenant?: Tenant) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));

    if (newTenant) {
      setTenant(newTenant);
      localStorage.setItem('tenant', JSON.stringify(newTenant));
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setTenant(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        tenant,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
