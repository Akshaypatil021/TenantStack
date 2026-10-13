import { Router } from 'express';
import { register, login, forgotPassword, resetPassword, googleAuth } from './auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

export default router;
