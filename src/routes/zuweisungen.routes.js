import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateZuweisungSchema } from '../validators/zuweisung.validator.js';
import * as controller from '../controllers/zuweisung.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/zuweisungen/:id
router.get('/:id', controller.getById);

// PUT /api/v1/zuweisungen/:id
router.put('/:id', authorize('admin', 'editor'), validate(updateZuweisungSchema), controller.update);

// DELETE /api/v1/zuweisungen/:id
router.delete('/:id', authorize('admin', 'editor'), controller.remove);

export default router;
