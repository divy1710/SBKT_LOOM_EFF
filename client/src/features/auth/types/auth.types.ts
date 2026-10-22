// ─── Auth types shared across the frontend ─────────────────────────────────

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FACTORY_ADMIN = 'FACTORY_ADMIN',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.FACTORY_ADMIN]: 'Factory Admin',
  [UserRole.MANAGER]: 'Manager',
  [UserRole.OPERATOR]: 'Operator',
  [UserRole.VIEWER]: 'Viewer',
};

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  factoryId?: string;
  factoryName?: string;
  factoryTimezone?: string;
  factoryLogo?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginFormData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}
