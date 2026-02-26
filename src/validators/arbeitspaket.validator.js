import Joi from 'joi';

const validateDateRange = (value, helpers) => {
  if (value.startDatum && value.endDatum && new Date(value.startDatum) > new Date(value.endDatum)) {
    return helpers.error('any.custom', { message: 'Startdatum muss vor Enddatum liegen.' });
  }
  return value;
};

export const createAPSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  beschreibung: Joi.string().allow('', null),
  status: Joi.string().valid('offen', 'in_bearbeitung', 'abgeschlossen').default('offen'),
  startDatum: Joi.string().isoDate().allow(null),
  endDatum: Joi.string().isoDate().allow(null),
  sortOrder: Joi.number().integer().default(0),
}).custom(validateDateRange);

export const updateAPSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  beschreibung: Joi.string().allow('', null),
  status: Joi.string().valid('offen', 'in_bearbeitung', 'abgeschlossen'),
  startDatum: Joi.string().isoDate().allow(null),
  endDatum: Joi.string().isoDate().allow(null),
  sortOrder: Joi.number().integer(),
  updatedAt: Joi.string().isoDate(),
}).min(1).custom(validateDateRange);
