import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createAPSchema, updateAPSchema } from '../validators/arbeitspaket.validator.js';
import * as controller from '../controllers/arbeitspaket.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/arbeitspakete/:id
router.get('/:id', controller.getById);

// POST /api/v1/arbeitspakete/:id/unter — Unter-AP erstellen
router.post('/:id/unter', authorize('admin', 'editor'), validate(createAPSchema), controller.createChild);

// PUT /api/v1/arbeitspakete/:id
router.put('/:id', authorize('admin', 'editor'), validate(updateAPSchema), controller.update);

// DELETE /api/v1/arbeitspakete/:id
router.delete('/:id', authorize('admin', 'editor'), controller.remove);

export default router;
