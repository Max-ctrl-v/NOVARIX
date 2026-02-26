import Joi from 'joi';

export const createProjektSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  beschreibung: Joi.string().allow('', null),
  status: Joi.string().valid('geplant', 'aktiv', 'abgeschlossen').default('geplant'),
  startDatum: Joi.string().isoDate().allow(null),
  endDatum: Joi.string().isoDate().allow(null),
});

export const updateProjektSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  beschreibung: Joi.string().allow('', null),
  status: Joi.string().valid('geplant', 'aktiv', 'abgeschlossen'),
  startDatum: Joi.string().isoDate().allow(null),
  endDatum: Joi.string().isoDate().allow(null),
  updatedAt: Joi.string().isoDate(),
}).min(1);
