import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createMitarbeiterSchema, updateMitarbeiterSchema, createBlockierungSchema } from '../validators/mitarbeiter.validator.js';
import * as controller from '../controllers/mitarbeiter.controller.js';
import * as blockController from '../controllers/blockierung.controller.js';

const router = Router();

router.use(authenticate);

// Mitarbeiter CRUD
router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', authorize('admin', 'editor'), validate(createMitarbeiterSchema), controller.create);
router.put('/:id', authorize('admin', 'editor'), validate(updateMitarbeiterSchema), controller.update);
router.delete('/:id', authorize('admin', 'editor'), controller.remove);

// Verschachtelte Blockierungen: /api/v1/mitarbeiter/:mid/blockierungen
router.get('/:mid/blockierungen', blockController.getByMitarbeiter);
router.post('/:mid/blockierungen', authorize('admin', 'editor'), validate(createBlockierungSchema), blockController.create);

export default router;
