const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { auth, authorize, validate } = require('../middleware');

// Public: list all departments
router.get('/', departmentController.getAllDepartments);

// Public: get single department by code
router.get('/:code', departmentController.getDepartmentByCode);

// Admin only: create department
router.post(
  '/',
  auth,
  authorize('super_admin', 'admin'),
  [
    body('name').notEmpty().withMessage('Department name is required'),
    body('code').notEmpty().withMessage('Department code is required')
      .matches(/^[a-z_]+$/).withMessage('Code must be lowercase with underscores only'),
    body('description').optional().isString(),
  ],
  validate,
  departmentController.createDepartment
);

// Admin only: update department
router.patch(
  '/:id',
  auth,
  authorize('super_admin', 'admin'),
  [
    param('id').isMongoId().withMessage('Invalid department ID'),
    body('name').optional().notEmpty(),
    body('description').optional().isString(),
    body('isActive').optional().isBoolean(),
  ],
  validate,
  departmentController.updateDepartment
);

// Admin only: delete (deactivate) department
router.delete(
  '/:id',
  auth,
  authorize('super_admin', 'admin'),
  [param('id').isMongoId().withMessage('Invalid department ID')],
  validate,
  departmentController.deleteDepartment
);

module.exports = router;
