import * as service from '../services/export.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getExportLog = asyncHandler(async (req, res) => {
  const { limit, offset } = req.query;
  const result = await service.getExportLog({
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  res.json(result);
});

export const registerExport = asyncHandler(async (req, res) => {
  const entry = await service.registerExport(req.body, req.user.id);
  res.status(201).json(entry);
});

export const getNextDokumentNummer = asyncHandler(async (req, res) => {
  const result = await service.getNextDokumentNummer();
  res.json(result);
});
