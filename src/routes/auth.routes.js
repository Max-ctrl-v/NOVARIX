import { Router } from 'express';
import { authLimiter } from '../config/security.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, changePasswordSchema, refreshSchema } from '../validators/auth.validator.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// POST /api/v1/auth/login
router.post('/login', authLimiter, validate(loginSchema), authController.login);

// POST /api/v1/auth/refresh
router.post('/refresh', authLimiter, validate(refreshSchema), authController.refresh);

// POST /api/v1/auth/logout (geschützt)
router.post('/logout', authenticate, authController.logout);

// POST /api/v1/auth/change-password (geschützt)
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

// GET /api/v1/auth/me (geschützt)
router.get('/me', authenticate, authController.me);

export default router;
