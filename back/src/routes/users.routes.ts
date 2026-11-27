import { Router } from 'express';
import { getPublicUser } from '../controllers/users.controller.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:id', optionalAuth, getPublicUser);

export default router;
