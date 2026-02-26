import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as controller from '../controllers/aenderungslog.controller.js';

const router = Router();

router.use(authenticate);

// GET /api/v1/aenderungslog?aktion=erstellt&entitaet=Firma&limit=50&offset=0
router.get('/', controller.getAll);

export default router;
