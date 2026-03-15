import Joi from 'joi';

export const createProjektSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  beschreibung: Joi.string().allow('', null),
  status: Joi.string().valid('geplant', 'aktiv', 'abgeschlossen').default('geplant'),
  startDatum: Joi.string().isoDate().allow(null),
  endDatum: Joi.string().isoDate().allow(null),
  sollKosten: Joi.number().min(0).allow(null),
  bescheinigteKosten: Joi.number().min(0).allow(null),
  foerdersatz: Joi.number().min(0).max(100).allow(null),
  foerdersumme: Joi.number().min(0).allow(null),
  honorarProzent: Joi.number().min(0).max(100).allow(null),
  honorar: Joi.number().min(0).allow(null),
});

export const updateProjektSchema = Joi.object({
  name: Joi.string().min(1).max(255),
  beschreibung: Joi.string().allow('', null),
  status: Joi.string().valid('geplant', 'aktiv', 'abgeschlossen'),
  startDatum: Joi.string().isoDate().allow(null),
  endDatum: Joi.string().isoDate().allow(null),
  sollKosten: Joi.number().min(0).allow(null),
  bescheinigteKosten: Joi.number().min(0).allow(null),
  foerdersatz: Joi.number().min(0).max(100).allow(null),
  foerdersumme: Joi.number().min(0).allow(null),
  honorarProzent: Joi.number().min(0).max(100).allow(null),
  honorar: Joi.number().min(0).allow(null),
  updatedAt: Joi.string().isoDate(),
  version: Joi.number().integer(),
}).min(1);
