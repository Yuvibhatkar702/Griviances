const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const AuditLog = require('../models/AuditLog');
const config = require('../config');

/**
 * Generate JWT token
 */
const generateToken = (admin) => {
  return jwt.sign(
    { id: admin._id, email: admin.email, role: admin.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

/**
 * Admin login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const admin = await Admin.findByCredentials(email, password);

    // Only super_admin and admin roles can use the admin login
    if (!['super_admin', 'admin'].includes(admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'This login is for administrators only. Please use the Official Portal.',
      });
    }

    const token = generateToken(admin);

    await AuditLog.log('admin_login', {
      admin: admin._id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: admin.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({
      success: false,
      message: error.message || 'Authentication failed',
    });
  }
};

/**
 * Get current admin profile
 */
exports.getProfile = async (req, res) => {
  res.json({
    success: true,
    data: req.admin.toJSON(),
  });
};

/**
 * Update admin profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ['name', 'phone', 'preferredLanguage', 'notificationPreferences'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const admin = await Admin.findByIdAndUpdate(
      req.admin._id,
      updates,
      { new: true, runValidators: true }
    );

    await AuditLog.log('admin_updated', {
      admin: admin._id,
      details: { updatedFields: Object.keys(updates) },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: admin.toJSON(),
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters',
      });
    }

    const admin = await Admin.findById(req.admin._id);
    const isMatch = await admin.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
    });
  }
};

/**
 * Logout (client-side token removal, but we log it)
 */
exports.logout = async (req, res) => {
  try {
    await AuditLog.log('admin_logout', {
      admin: req.admin._id,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }
};

/**
 * Get all admins (super admin only)
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');

    res.json({
      success: true,
      data: admins,
    });
  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins',
    });
  }
};

/**
 * Create new admin (super admin only)
 */
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, name, phone, role, department, permissions } = req.body;

    // Check if email exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const admin = new Admin({
      email,
      password,
      name,
      phone,
      role: role || 'moderator',
      department: department || 'general',
      permissions: permissions || {},
    });

    await admin.save();

    await AuditLog.log('admin_created', {
      admin: req.admin._id,
      details: {
        createdAdminId: admin._id,
        email: admin.email,
        role: admin.role,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: admin.toJSON(),
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin',
    });
  }
};

/**
 * Update admin (super admin only)
 */
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating own role to non-super_admin
    if (id === req.admin._id.toString() && updates.role && updates.role !== 'super_admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role',
      });
    }

    // Don't allow password update through this endpoint
    delete updates.password;

    const admin = await Admin.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    await AuditLog.log('admin_updated', {
      admin: req.admin._id,
      details: {
        updatedAdminId: id,
        updatedFields: Object.keys(updates),
      },
    });

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: admin.toJSON(),
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin',
    });
  }
};

/**
 * Delete/Deactivate admin (super admin only)
 */
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.admin._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account',
      });
    }

    // Soft delete by deactivating
    const admin = await Admin.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    res.json({
      success: true,
      message: 'Admin deactivated successfully',
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin',
    });
  }
};

/**
 * Seed all default accounts (admin + dept heads + officers) for production.
 * Only works when no super_admin exists yet, OR when called with correct seed secret.
 */
exports.seedAccounts = async (req, res) => {
  try {
    const Department = require('../models/Department');

    // Ensure departments exist first
    await Department.seedDefaults();

    const results = { created: [], skipped: [] };

    // Define all accounts to seed
    const accounts = [
      {
        email: 'admin@grievance.com',
        password: 'Admin@123',
        name: 'Super Admin',
        role: 'super_admin',
        department: 'all',
        departmentCode: null,
        permissions: {
          canViewComplaints: true,
          canUpdateStatus: true,
          canAssignComplaints: true,
          canDeleteComplaints: true,
          canManageAdmins: true,
          canViewAnalytics: true,
          canExportData: true,
        },
      },
      {
        email: 'road.head@grievance.com',
        password: 'Head@123',
        name: 'Road Dept Head',
        role: 'department_head',
        department: 'road_department',
        departmentCode: 'road_department',
        permissions: {
          canViewComplaints: true,
          canUpdateStatus: true,
          canAssignComplaints: true,
          canDeleteComplaints: false,
          canManageAdmins: false,
          canViewAnalytics: true,
          canExportData: true,
        },
      },
      {
        email: 'sanitation.head@grievance.com',
        password: 'Head@123',
        name: 'Sanitation Dept Head',
        role: 'department_head',
        department: 'sanitation_department',
        departmentCode: 'sanitation_department',
        permissions: {
          canViewComplaints: true,
          canUpdateStatus: true,
          canAssignComplaints: true,
          canDeleteComplaints: false,
          canManageAdmins: false,
          canViewAnalytics: true,
          canExportData: true,
        },
      },
      {
        email: 'electricity.head@grievance.com',
        password: 'Head@123',
        name: 'Electricity Dept Head',
        role: 'department_head',
        department: 'electricity_department',
        departmentCode: 'electricity_department',
        permissions: {
          canViewComplaints: true,
          canUpdateStatus: true,
          canAssignComplaints: true,
          canDeleteComplaints: false,
          canManageAdmins: false,
          canViewAnalytics: true,
          canExportData: true,
        },
      },
      {
        email: 'road.officer@grievance.com',
        password: 'Officer@123',
        name: 'Road Officer',
        role: 'officer',
        department: 'road_department',
        departmentCode: 'road_department',
        permissions: {
          canViewComplaints: true,
          canUpdateStatus: true,
          canAssignComplaints: false,
          canDeleteComplaints: false,
          canManageAdmins: false,
          canViewAnalytics: false,
          canExportData: false,
        },
      },
      {
        email: 'sanitation.officer@grievance.com',
        password: 'Officer@123',
        name: 'Sanitation Officer',
        role: 'officer',
        department: 'sanitation_department',
        departmentCode: 'sanitation_department',
        permissions: {
          canViewComplaints: true,
          canUpdateStatus: true,
          canAssignComplaints: false,
          canDeleteComplaints: false,
          canManageAdmins: false,
          canViewAnalytics: false,
          canExportData: false,
        },
      },
      {
        email: 'electricity.officer@grievance.com',
        password: 'Officer@123',
        name: 'Electricity Officer',
        role: 'officer',
        department: 'electricity_department',
        departmentCode: 'electricity_department',
        permissions: {
          canViewComplaints: true,
          canUpdateStatus: true,
          canAssignComplaints: false,
          canDeleteComplaints: false,
          canManageAdmins: false,
          canViewAnalytics: false,
          canExportData: false,
        },
      },
    ];

    for (const acct of accounts) {
      const existing = await Admin.findOne({ email: acct.email });
      if (existing) {
        results.skipped.push(acct.email);
        continue;
      }

      // Link departmentRef if departmentCode provided
      let departmentRef = null;
      if (acct.departmentCode) {
        const dept = await Department.findOne({ code: acct.departmentCode });
        if (dept) departmentRef = dept._id;
      }

      const admin = new Admin({
        email: acct.email,
        password: acct.password, // pre-save hook will hash
        name: acct.name,
        role: acct.role,
        department: acct.department,
        departmentCode: acct.departmentCode,
        departmentRef,
        permissions: acct.permissions,
      });

      await admin.save();
      results.created.push(acct.email);
    }

    res.json({
      success: true,
      message: `Seed complete: ${results.created.length} created, ${results.skipped.length} skipped`,
      data: results,
    });
  } catch (error) {
    console.error('Seed accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed accounts: ' + error.message,
    });
  }
};

/**
 * Initialize first super admin (should only work once)
 */
exports.initializeSuperAdmin = async (req, res) => {
  try {
    // Check if any admin exists
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Admin already exists. Use login instead.',
      });
    }

    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required',
      });
    }

    const admin = new Admin({
      email,
      password,
      name,
      role: 'super_admin',
      department: 'all',
      permissions: {
        canViewComplaints: true,
        canUpdateStatus: true,
        canAssignComplaints: true,
        canDeleteComplaints: true,
        canManageAdmins: true,
        canViewAnalytics: true,
        canExportData: true,
      },
    });

    await admin.save();
    const token = generateToken(admin);

    res.status(201).json({
      success: true,
      message: 'Super admin created successfully',
      data: {
        admin: admin.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error('Initialize super admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create super admin',
    });
  }
};
