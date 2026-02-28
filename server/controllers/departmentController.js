const Department = require('../models/Department');
const AuditLog = require('../models/AuditLog');

/**
 * Get all departments
 */
exports.getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true }).sort({ name: 1 });
    res.json({
      success: true,
      data: departments,
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
};

/**
 * Get single department by code
 */
exports.getDepartmentByCode = async (req, res) => {
  try {
    const department = await Department.findOne({ code: req.params.code, isActive: true });
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    res.json({ success: true, data: department });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch department' });
  }
};

/**
 * Create a new department (admin only)
 */
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    const existing = await Department.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Department name or code already exists' });
    }

    const department = await Department.create({ name, code, description });

    await AuditLog.log('department_created', {
      admin: req.admin._id,
      details: { departmentId: department._id, name, code },
    });

    res.status(201).json({ success: true, data: department });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ success: false, message: 'Failed to create department' });
  }
};

/**
 * Update a department (admin only)
 */
exports.updateDepartment = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    if (name !== undefined) department.name = name;
    if (description !== undefined) department.description = description;
    if (isActive !== undefined) department.isActive = isActive;
    await department.save();

    res.json({ success: true, data: department });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ success: false, message: 'Failed to update department' });
  }
};

/**
 * Delete (deactivate) a department (admin only)
 */
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    // Check if department has associated complaints
    const Complaint = require('../models/Complaint');
    const complaintCount = await Complaint.countDocuments({ department: department.code });
    if (complaintCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: this department has ${complaintCount} complaint(s). Reassign or resolve them first.`,
      });
    }

    // Check if department has assigned officials
    const Admin = require('../models/Admin');
    const officialCount = await Admin.countDocuments({ departmentCode: department.code, isActive: true });
    if (officialCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: this department has ${officialCount} active official(s). Remove them first.`,
      });
    }

    await Department.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: `Department "${department.name}" has been permanently deleted` });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete department' });
  }
};
