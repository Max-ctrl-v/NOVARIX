-- Add 'feiertag' value to BlockierungsTyp enum
-- Allows individual employees to have custom holidays (not in the governmental list)
ALTER TYPE "BlockierungsTyp" ADD VALUE 'feiertag';
