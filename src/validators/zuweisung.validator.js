import Joi from 'joi';

const apVerteilungItem = Joi.object({
  arbeitspaketId: Joi.string().uuid().required(),
  prozentAnteil: Joi.number().min(0).max(100).required(),
});

const validateDateRange = (value, helpers) => {
  if (value.von && value.bis && new Date(value.von) > new Date(value.bis)) {
    return helpers.error('any.custom', { message: 'Startdatum (von) muss vor Enddatum (bis) liegen.' });
  }
  return value;
};

export const createZuweisungSchema = Joi.object({
  mitarbeiterId: Joi.string().uuid().required(),
  ueberProjektId: Joi.string().uuid().required(),
  prozentAnteil: Joi.number().min(1).max(100).required(),
  von: Joi.string().isoDate().required(),
  bis: Joi.string().isoDate().required(),
  arbeitspaketVerteilung: Joi.array().items(apVerteilungItem).default([]),
}).custom(validateDateRange);

export const updateZuweisungSchema = Joi.object({
  prozentAnteil: Joi.number().min(1).max(100),
  von: Joi.string().isoDate(),
  bis: Joi.string().isoDate(),
  arbeitspaketVerteilung: Joi.array().items(apVerteilungItem),
  updatedAt: Joi.string().isoDate(),
}).min(1).custom(validateDateRange);
