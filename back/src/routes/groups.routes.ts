import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createGroup, getGroupDetails, getPlanSettings, joinGroup, listAll, listInterests, listMine } from '../controllers/groups.controller.js';

const router = Router();
router.get('/', listAll);
router.get('/plans', getPlanSettings);
router.get('/:id/details', getGroupDetails);
router.get('/mine', requireAuth, listMine);
router.get('/interests', requireAuth, listInterests);
router.post('/:id/join', requireAuth, joinGroup);
router.post('/', requireAuth, createGroup);

export default router;
