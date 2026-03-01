import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import * as controller from '../controllers/dokument.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Nur PDF-Dateien sind erlaubt.'), false);
  },
});

const router = Router();
router.use(authenticate);

// Project documents
router.post('/projekte/:projektId/dokumente', authorize('admin', 'editor'), upload.single('file'), controller.upload);
router.get('/projekte/:projektId/dokumente', controller.list);

// Single document
router.get('/dokumente/:id/download', controller.download);
router.delete('/dokumente/:id', authorize('admin', 'editor'), controller.remove);

export default router;
