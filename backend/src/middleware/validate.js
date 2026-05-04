const Joi = require('joi');

/**
 * Validation middleware factory
 * Usage: validate(schemas.submission) 
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/"/g, ''),
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
    }

    req[source] = value;
    next();
  };
}

// ============================================
// Validation Schemas
// ============================================
const schemas = {
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
    password: Joi.string().min(6).required().messages({
      'string.min': 'Password must be at least 6 characters',
      'any.required': 'Password is required',
    }),
  }),

  submission: Joi.object({
    name: Joi.string().max(100).required().messages({
      'any.required': 'Name is required',
      'string.max': 'Name must be 100 characters or less',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),
    team: Joi.string().max(50).allow('', null).optional(),
    content_title: Joi.string().max(200).allow('', null).optional(),
    content_description: Joi.string().min(20).required().messages({
      'string.min': 'Content description must be at least 20 characters',
      'any.required': 'Content description is required',
    }),
    content_type: Joi.string()
      .valid('post', 'event', 'course', 'announcement')
      .default('post'),
    priority: Joi.string()
      .valid('low', 'medium', 'high')
      .default('medium'),
    tone_preference: Joi.string()
      .valid('formal', 'casual', 'promotional')
      .default('formal'),
  }),

  approval: Joi.object({
    draft_id: Joi.string().uuid().required().messages({
      'string.guid': 'Invalid draft ID format',
      'any.required': 'Draft ID is required',
    }),
    reviewer_name: Joi.string().max(100).required(),
    reviewer_email: Joi.string().email().optional(),
    decision: Joi.string().valid('approved', 'rejected').required().messages({
      'any.only': 'Decision must be "approved" or "rejected"',
      'any.required': 'Decision is required',
    }),
    feedback: Joi.when('decision', {
      is: 'rejected',
      then: Joi.string().min(5).required().messages({
        'any.required': 'Feedback is required when rejecting',
        'string.min': 'Feedback must be at least 5 characters',
      }),
      otherwise: Joi.string().allow('', null).optional(),
    }),
    edited_linkedin: Joi.string().max(3000).allow('', null).optional(),
    edited_twitter: Joi.string().max(280).allow('', null).optional(),
    edited_instagram: Joi.string().max(2200).allow('', null).optional(),
    scheduled_time: Joi.date().iso().min('now').allow(null).optional(),
  }),

  draftQuery: Joi.object({
    status: Joi.string()
      .valid('ready_for_review', 'approved', 'rejected', 'regenerating')
      .optional(),
    team: Joi.string().max(50).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0).default(0),
    mine: Joi.string().valid('true', 'false').optional(),
    teamOnly: Joi.string().valid('true', 'false').optional(),
  }),
};

module.exports = { validate, schemas };
