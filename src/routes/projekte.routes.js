import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createProjektSchema, updateProjektSchema } from '../validators/projekt.validator.js';
import * as controller from '../controllers/projekt.controller.js';
import * as apController from '../controllers/arbeitspaket.controller.js';
import * as zuweisungController from '../controllers/zuweisung.controller.js';
import { createAPSchema } from '../validators/arbeitspaket.validator.js';
import { createZuweisungSchema } from '../validators/zuweisung.validator.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/projekte/:id — Einzelnes Projekt mit APs + Zuweisungen
router.get('/:id', controller.getById);

// PUT /api/v1/projekte/:id
router.put('/:id', authorize('admin', 'editor'), validate(updateProjektSchema), controller.update);

// DELETE /api/v1/projekte/:id
router.delete('/:id', authorize('admin', 'editor'), controller.remove);

// Verschachtelte AP-Routen: /api/v1/projekte/:pid/arbeitspakete
router.get('/:pid/arbeitspakete', apController.getByProjekt);
router.post('/:pid/arbeitspakete', authorize('admin', 'editor'), validate(createAPSchema), apController.create);

// Verschachtelte Zuweisungs-Routen: /api/v1/projekte/:pid/zuweisungen
router.get('/:pid/zuweisungen', zuweisungController.getByProjekt);
router.post('/:pid/zuweisungen', authorize('admin', 'editor'), validate(createZuweisungSchema), zuweisungController.create);

export default router;
