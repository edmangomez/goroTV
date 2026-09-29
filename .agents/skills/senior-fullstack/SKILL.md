---
name: senior-fullstack
description: Integración end-to-end entre App Cliente goroTV, Panel Admin y Backend API. Contratos de tipos TypeScript compartidos, sincronización de estados y flujos de autenticación.
---

# Skill: Senior Fullstack (goroTV)

Coordinación e integración entre cliente, panel y servidor.

## Contratos de Tipos Clave
- **Cliente Auth**:
  ```ts
  interface ClientLoginResponse {
    token: string;
    user: {
      username: string;
      displayName?: string;
      expiresAt: string;
      daysRemaining: number;
      maxConnections: number;
    };
    provider: {
      host: string;
      username: string;
      password: string; // entregado de forma transparente al reproductor
    };
  }
  ```
- **Error de Conexión Excedida**:
  ```ts
  interface SessionLimitError {
    error: 'SESSION_LIMIT_EXCEEDED';
    message: 'Has alcanzado el límite de pantallas simultáneas permitidas.';
    activeDevices: number;
    maxAllowed: number;
  }
  ```
- **Error de Cuenta Vencida**:
  ```ts
  interface ExpiredAccountError {
    error: 'ACCOUNT_EXPIRED';
    message: 'Tu suscripción ha vencido.';
    expiredAt: string;
  }
  ```
