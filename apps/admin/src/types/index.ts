export interface Admin {
  id: number;
  username: string;
}

export interface Provider {
  id: number;
  name: string;
  host: string;
  username: string;
  password?: string;
  is_active: number;
  notes?: string;
  user_count?: number;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  provider_id: number;
  provider_name?: string;
  max_connections: number;
  expires_at: string;
  days_remaining: number;
  active_screens: number;
  is_active: number;
  display_name?: string;
  phone?: string;
  notes?: string;
  created_at: string;
}

export interface ActiveSession {
  device_id: string;
  device_name: string;
  ip_address: string;
  last_ping: string;
  created_at: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  expiredUsers: number;
  expiringSoonUsers: number;
  activeSessions: number;
  totalProviders: number;
}
