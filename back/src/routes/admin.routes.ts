import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import {
  createEvent,
  createGroupInterest,
  deleteEvent,
  deleteGroup,
  listGroupInterests,
  listEvents,
  listGroups,
  updateEvent
} from '../controllers/admin.controller.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/groups', listGroups);
router.delete('/groups/:id', deleteGroup);
router.get('/interests', listGroupInterests);
router.post('/interests', createGroupInterest);
router.post('/events', createEvent);
router.get('/events', listEvents);
router.patch('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

export default router;
