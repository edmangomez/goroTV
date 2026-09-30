import { Router } from 'express';
import {
  adminLogin,
  getDashboardStats,
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider,
  getUsers,
  createUser,
  updateUser,
  renewUser,
  toggleUserStatus,
  deleteUser,
  getUserSessions,
  terminateUserSessions,
  getAdmins,
  createAdmin,
  changeAdminPassword,
  deleteAdmin
} from '../controllers/adminController.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

export const adminRouter = Router();

// Login de administrador
adminRouter.post('/login', adminLogin);

// Todas las rutas siguientes requieren autenticación de administrador
adminRouter.use(requireAdmin);

// Métricas de dashboard
adminRouter.get('/dashboard', getDashboardStats);

// Proveedores Xtream Codes
adminRouter.get('/providers', getProviders);
adminRouter.post('/providers', createProvider);
adminRouter.put('/providers/:id', updateProvider);
adminRouter.delete('/providers/:id', deleteProvider);
adminRouter.post('/providers/:id/test', testProvider);

// Gestión de clientes
adminRouter.get('/users', getUsers);
adminRouter.post('/users', createUser);
adminRouter.put('/users/:id', updateUser);
adminRouter.delete('/users/:id', deleteUser);
adminRouter.post('/users/:id/renew', renewUser);
adminRouter.post('/users/:id/toggle-status', toggleUserStatus);
adminRouter.get('/users/:id/sessions', getUserSessions);
adminRouter.delete('/users/:id/sessions', terminateUserSessions);

// Gestión y Seguridad de Administradores
adminRouter.get('/admins', getAdmins);
adminRouter.post('/admins', createAdmin);
adminRouter.post('/change-password', changeAdminPassword);
adminRouter.delete('/admins/:id', deleteAdmin);

