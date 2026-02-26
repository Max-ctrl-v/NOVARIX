import * as service from '../services/papierkorb.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const papierkorb = await service.getAll();
  res.json(papierkorb);
});

export const restore = asyncHandler(async (req, res) => {
  const result = await service.restore(req.params.id, req.user.id);
  res.json(result);
});

export const permanentDelete = asyncHandler(async (req, res) => {
  const result = await service.permanentDelete(req.params.id, req.user.id);
  res.json(result);
});
