import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateBlockierungSchema } from '../validators/mitarbeiter.validator.js';
import * as controller from '../controllers/blockierung.controller.js';

const router = Router();

router.use(authenticate);

// PUT /api/v1/blockierungen/:id
router.put('/:id', authorize('admin', 'editor'), validate(updateBlockierungSchema), controller.update);

// DELETE /api/v1/blockierungen/:id
router.delete('/:id', authorize('admin', 'editor'), controller.remove);

export default router;
