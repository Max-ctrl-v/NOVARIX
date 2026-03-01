import * as sessionLogService from '../services/sessionLog.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getAll = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;
  const result = await sessionLogService.getSessionLogs({ limit, offset });
  res.json(result);
});
