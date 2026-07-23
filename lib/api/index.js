/**
 * @fileoverview API Standardizer - Index
 * 
 * Exporta centralizada de todos os módulos do API Response Standardizer.
 * 
 * @module lib/api
 * @author API Standardizer Team
 * @version 1.0.0
 */

// Exporta defaults consolidadas
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