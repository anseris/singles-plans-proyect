import { Router } from 'express';
import {
  currentUser,
  login,
  register,
  requestPasswordReset,
  resetPassword,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/password/forgot', requestPasswordReset);
router.post('/password/reset', resetPassword);
router.get('/me', requireAuth, currentUser);

export default router;
