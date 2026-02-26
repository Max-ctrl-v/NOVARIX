import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { registerExportSchema } from '../validators/export.validator.js';
import * as controller from '../controllers/export.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/export/log — Export-Historie
router.get('/log', controller.getExportLog);

// POST /api/v1/export/log — Export registrieren
router.post('/log', authorize('admin', 'editor'), validate(registerExportSchema), controller.registerExport);

// GET /api/v1/export/dokument-nummer — Nächste Dokumentnummer (Vorschau)
router.get('/dokument-nummer', controller.getNextDokumentNummer);

export default router;
