import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createGroup, listMine } from '../controllers/groups.controller.js';

const router = Router();
router.use(requireAuth);
router.get('/mine', listMine);
router.post('/', createGroup);

export default router;
