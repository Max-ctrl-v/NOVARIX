import * as service from '../services/backup.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const exportAll = asyncHandler(async (req, res) => {
  await service.streamExport(res);
});

export const importAll = asyncHandler(async (req, res) => {
  const result = await service.importAll(req.body, req.user.id);
  res.json(result);
});

export const importFromLocalStorage = asyncHandler(async (req, res) => {
  const result = await service.importFromLocalStorage(req.body, req.user.id);
  res.json(result);
});
