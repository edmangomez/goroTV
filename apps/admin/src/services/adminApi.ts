import { DashboardStats, Provider, User, ActiveSession } from '../types';

const API_BASE = '/api/admin';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('gorotv_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401 || res.status === 403) {
    if (window.location.pathname !== '/login') {
      localStorage.removeItem('gorotv_admin_token');
      localStorage.removeItem('gorotv_admin_user');
      window.dispatchEvent(new Event('gorotv_admin_logout'));
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Error ${res.status}: ${res.statusText}`);
  }
  return data;
}

export const adminApi = {
  // Autenticación
  async login(username: string, password: string): Promise<{ token: string; admin: { id: number; username: string } }> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return handleResponse(res);
  },

  // Dashboard
  async getDashboard(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Proveedores
  async getProviders(): Promise<Provider[]> {
    const res = await fetch(`${API_BASE}/providers`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createProvider(data: { name: string; host: string; username: string; password: string; notes?: string }): Promise<Provider> {
    const res = await fetch(`${API_BASE}/providers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateProvider(id: number, data: Partial<Provider>): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/providers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async deleteProvider(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/providers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async testProvider(id: number): Promise<{ success: boolean; message: string; providerExpiry?: string; activeCons?: number; maxCons?: number }> {
    const res = await fetch(`${API_BASE}/providers/${id}/test`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  // Clientes
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async createUser(data: {
    username: string;
    password: string;
    providerId: number;
    maxConnections: number;
    days?: number;
    customExpiryDate?: string;
    displayName?: string;
    phone?: string;
    notes?: string;
  }): Promise<{ id: number; username: string; expiresAt: string }> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateUser(id: number, data: {
    password?: string;
    providerId?: number;
    maxConnections?: number;
    displayName?: string;
    phone?: string;
    notes?: string;
    is_active?: number;
  }): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async renewUser(id: number, days?: number, customDate?: string): Promise<{ success: boolean; message: string; expiresAt: string }> {
    const res = await fetch(`${API_BASE}/users/${id}/renew`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ days, customDate })
    });
    return handleResponse(res);
  },

  async toggleUserStatus(id: number): Promise<{ success: boolean; isActive: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}/toggle-status`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async deleteUser(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async getUserSessions(id: number): Promise<ActiveSession[]> {
    const res = await fetch(`${API_BASE}/users/${id}/sessions`, {
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  },

  async terminateUserSessions(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}/sessions`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return handleResponse(res);
  }
};
