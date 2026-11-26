import { Router } from 'express';
import {
  currentUser,
  login,
  register,
  requestPasswordReset,
  resetPassword,
} from '../controllers/auth.controller.js';
import { oauthCallback, startOAuth } from '../controllers/oauth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/password/forgot', requestPasswordReset);
router.post('/password/reset', resetPassword);
router.get('/oauth/:provider', startOAuth);
router.get('/oauth/:provider/callback', oauthCallback);
router.post('/oauth/:provider/callback', oauthCallback);
router.get('/me', requireAuth, currentUser);

export default router;
