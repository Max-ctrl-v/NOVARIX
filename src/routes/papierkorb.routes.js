import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import * as controller from '../controllers/papierkorb.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/papierkorb — Alle gelöschten Objekte
router.get('/', authorize('admin'), controller.getAll);

// POST /api/v1/papierkorb/:id/restore — Wiederherstellen
router.post('/:id/restore', authorize('admin'), controller.restore);

// DELETE /api/v1/papierkorb/:id — Endgültig löschen
router.delete('/:id', authorize('admin'), controller.permanentDelete);

export default router;
