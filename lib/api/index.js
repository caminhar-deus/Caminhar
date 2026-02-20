/**
 * @fileoverview API Standardizer - Index
 * 
 * Exporta centralizada de todos os módulos do API Response Standardizer.
 * 
 * @module lib/api
 * @author API Standardizer Team
 * @version 1.0.0
 */

// Exporta todos os módulos
export * from './errors.js';
export * from './response.js';
export * from './validate.js';
export * from './middleware.js';

// Exporta defaults
import errors from './errors.js';
import response from './response.js';
import validate from './validate.js';
import middleware from './middleware.js';

export default {
  errors,
  response,
  validate,
  middleware,
};
