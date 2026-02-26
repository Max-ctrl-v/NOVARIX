import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createUeberProjektSchema, updateUeberProjektSchema } from '../validators/ueberprojekt.validator.js';
import * as controller from '../controllers/ueberprojekt.controller.js';
import * as projektController from '../controllers/projekt.controller.js';
import { createProjektSchema } from '../validators/projekt.validator.js';

const router = Router();

router.use(authenticate);

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', authorize('admin', 'editor'), validate(createUeberProjektSchema), controller.create);
router.put('/:id', authorize('admin', 'editor'), validate(updateUeberProjektSchema), controller.update);
router.delete('/:id', authorize('admin', 'editor'), controller.remove);

// Verschachtelte Projekt-Routen: /api/v1/ueberprojekte/:uid/projekte
router.get('/:uid/projekte', projektController.getByUeberProjekt);
router.post('/:uid/projekte', authorize('admin', 'editor'), validate(createProjektSchema), projektController.create);

export default router;
