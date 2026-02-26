import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createFeiertagSchema } from '../validators/feiertag.validator.js';
import * as controller from '../controllers/feiertag.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', authorize('admin', 'editor'), validate(createFeiertagSchema), controller.create);
router.delete('/:id', authorize('admin', 'editor'), controller.remove);

export default router;
