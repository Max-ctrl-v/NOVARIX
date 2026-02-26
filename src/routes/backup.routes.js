import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import * as controller from '../controllers/backup.controller.js';

const router = Router();

router.use(authenticate, authorize('admin'));

// GET /api/v1/backup/export — Kompletter JSON-Export
router.get('/export', controller.exportAll);

// POST /api/v1/backup/import — JSON-Import (überschreibt Daten)
router.post('/import', controller.importAll);

// POST /api/v1/backup/migrate-localstorage — localStorage-Format importieren
router.post('/migrate-localstorage', controller.importFromLocalStorage);

export default router;
