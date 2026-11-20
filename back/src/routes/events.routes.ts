import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { createCommunityEvent, enroll, listMine, listPublic } from '../controllers/events.controller.js';

const router = Router();

router.get('/', listPublic);
router.get('/mine', requireAuth, listMine);
router.post('/', requireAuth, createCommunityEvent);
router.post('/:id/enroll', requireAuth, enroll);

export default router;
