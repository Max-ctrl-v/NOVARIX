import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import * as controller from '../controllers/sessionLog.controller.js';

const router = Router();
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', controller.getAll);

export default router;
