import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
import * as controller from '../controllers/dokument.controller.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png', 'image/jpeg', 'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword', 'application/vnd.ms-excel',
  'text/csv', 'application/zip',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error('Dateityp nicht erlaubt. Erlaubt: PDF, Bilder, Word, Excel, CSV, ZIP.'), false);
  },
});

const router = Router();
router.use(authenticate);

// Project documents
router.post('/projekte/:projektId/dokumente', authorize('admin', 'editor'), upload.single('file'), controller.upload);
router.get('/projekte/:projektId/dokumente', controller.list);

// Generic document upload (no project association)
router.post('/dokumente/upload', authorize('admin', 'editor'), upload.single('file'), controller.uploadGeneric);
router.get('/dokumente/by-ids', controller.listByIds);

// Single document
router.get('/dokumente/:id/download', controller.download);
router.delete('/dokumente/:id', authorize('admin', 'editor'), controller.remove);

export default router;
