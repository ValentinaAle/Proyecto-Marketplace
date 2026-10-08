import { Router } from 'express';
import * as authController from '../controllers/authController';
import authMiddleware from '../middlewares/auth';
import upload from '../middlewares/upload';

const router = Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET  /api/auth/me  (protegida)
router.get('/me', authMiddleware, authController.me);

router.put('/profile', authMiddleware, authController.updateProfile);
router.put('/password', authMiddleware, authController.changePassword);
router.post('/avatar', authMiddleware, upload.single('avatar'), authController.uploadAvatar);

export default router;
