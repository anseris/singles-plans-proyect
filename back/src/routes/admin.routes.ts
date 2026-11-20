import { Router } from 'express';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import {
  createEvent,
  deleteEvent,
  deleteGroup,
  listEvents,
  listGroups,
  updateEvent
} from '../controllers/admin.controller.js';

const router = Router();
router.use(requireAuth, requireAdmin);

router.get('/groups', listGroups);
router.delete('/groups/:id', deleteGroup);
router.post('/events', createEvent);
router.get('/events', listEvents);
router.patch('/events/:id', updateEvent);
router.delete('/events/:id', deleteEvent);

export default router;
