import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.middleware.js';
import { cancelCommunityEvent, createCommunityEvent, deleteCommunityEvent, enroll, getEventDetails, listEventAttendees, listMine, listPublic, unenroll, updateCommunityEvent } from '../controllers/events.controller.js';

const router = Router();

router.get('/', optionalAuth, listPublic);
router.get('/mine', requireAuth, listMine);
router.get('/:id/attendees', optionalAuth, listEventAttendees);
router.get('/:id/details', optionalAuth, getEventDetails);
router.post('/', requireAuth, createCommunityEvent);
router.patch('/:id', requireAuth, updateCommunityEvent);
router.delete('/:id', requireAuth, deleteCommunityEvent);
router.post('/:id/cancel', requireAuth, cancelCommunityEvent);
router.post('/:id/enroll', requireAuth, enroll);
router.delete('/:id/enroll', requireAuth, unenroll);

export default router;
