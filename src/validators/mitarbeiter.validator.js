import Joi from 'joi';

export const createMitarbeiterSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  position: Joi.string().max(255).allow('', null),
  wochenStunden: Joi.number().min(1).max(60).default(40),
  jahresUrlaub: Joi.number().integer().min(0).max(365).default(30),
  jahresgehalt: Joi.number().min(0).allow(null),
  lohnnebenkosten: Joi.number().min(0).allow(null),
  feiertagePflicht: Joi.boolean().default(true),
});

export const updateMitarbeiterSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  position: Joi.string().max(255).allow('', null),
  wochenStunden: Joi.number().min(1).max(60),
  jahresUrlaub: Joi.number().integer().min(0).max(365),
  jahresgehalt: Joi.number().min(0).allow(null),
  lohnnebenkosten: Joi.number().min(0).allow(null),
  feiertagePflicht: Joi.boolean(),
  updatedAt: Joi.string().isoDate(),
}).min(1);

const validateDateRange = (value, helpers) => {
  if (value.von && value.bis && new Date(value.von) > new Date(value.bis)) {
    return helpers.error('any.custom', { message: 'Startdatum (von) muss vor Enddatum (bis) liegen.' });
  }
  return value;
};

export const createBlockierungSchema = Joi.object({
  von: Joi.string().isoDate().required(),
  bis: Joi.string().isoDate().required(),
  typ: Joi.string().valid('urlaub', 'krank').required(),
}).custom(validateDateRange);

export const updateBlockierungSchema = Joi.object({
  von: Joi.string().isoDate(),
  bis: Joi.string().isoDate(),
  typ: Joi.string().valid('urlaub', 'krank'),
}).min(1).custom(validateDateRange);
