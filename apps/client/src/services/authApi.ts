const API_BASE = '/api/client';

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem('gorotv_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('gorotv_device_id', deviceId);
  }
  return deviceId;
}

export function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/Android.*TV|SmartTV|Tizen|webOS/i.test(ua)) return 'Smart TV';
  if (/iPad|Tablet/i.test(ua)) return 'Tablet';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Móvil';
  return 'Navegador Web';
}

export const authApi = {
  async login(username: string, password: string): Promise<any> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || data.error || 'Error de inicio de sesión') as any;
      err.code = data.error;
      err.expiresAt = data.expiresAt;
      throw err;
    }
    return data;
  },

  async getStatus(token: string): Promise<any> {
    const res = await fetch(`${API_BASE}/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Error al validar estado') as any;
      err.code = data.error;
      throw err;
    }
    return data;
  },

  async sendHeartbeat(token: string): Promise<{ success: boolean; activeConnections: number; maxAllowed: number }> {
    const deviceId = getOrCreateDeviceId();
    const deviceName = getDeviceName();

    const res = await fetch(`${API_BASE}/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ deviceId, deviceName }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.message || 'Error de sesión') as any;
      err.code = data.error;
      err.activeConnections = data.activeConnections;
      err.maxAllowed = data.maxAllowed;
      throw err;
    }
    return data;
  },

  async closeSession(token: string): Promise<void> {
    const deviceId = getOrCreateDeviceId();
    try {
      await fetch(`${API_BASE}/session`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ deviceId }),
      });
    } catch {
      // Ignorar errores en logout
    }
  },
};
