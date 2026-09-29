import { Router } from 'express';
import * as authController from '../controllers/authController';
import authMiddleware from '../middlewares/auth';

const router = Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET  /api/auth/me  (protegida)
router.get('/me', authMiddleware, authController.me);

router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/password', authMiddleware, authController.changePassword);

export default router;
