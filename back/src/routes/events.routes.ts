import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';
import { createCommunityEvent, enroll, getEventDetails, listMine, listPublic } from '../controllers/events.controller.js';

const router = Router();

router.get('/', listPublic);
router.get('/mine', requireAuth, listMine);
router.get('/:id/details', optionalAuth, getEventDetails);
router.post('/', requireAuth, createCommunityEvent);
router.post('/:id/enroll', requireAuth, enroll);

export default router;
