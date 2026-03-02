import * as dokumentService from '../services/dokument.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const upload = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  const doc = await dokumentService.upload(req.params.projektId, req.file, req.user.id);
  res.status(201).json(doc);
});

export const uploadGeneric = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen.' });
  const doc = await dokumentService.uploadGeneric(req.file, req.user.id);
  res.status(201).json(doc);
});

export const list = asyncHandler(async (req, res) => {
  const docs = await dokumentService.listByProjekt(req.params.projektId);
  res.json(docs);
});

export const listByIds = asyncHandler(async (req, res) => {
  const ids = req.query.ids ? req.query.ids.split(',').filter(Boolean) : [];
  const docs = await dokumentService.listByIds(ids);
  res.json(docs);
});

export const download = asyncHandler(async (req, res) => {
  const doc = await dokumentService.download(req.params.id);
  res.set({
    'Content-Type': doc.mimeType,
    'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.name)}"`,
    'Content-Length': doc.data.length,
  });
  res.send(doc.data);
});

export const remove = asyncHandler(async (req, res) => {
  await dokumentService.remove(req.params.id, req.user.id);
  res.json({ message: 'Dokument gelöscht.' });
});
