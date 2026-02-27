const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },

  description: {
    type: String,
    trim: true,
    default: '',
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

/**
 * Seed default departments if none exist.
 * Call once during server startup.
 */
departmentSchema.statics.seedDefaults = async function () {
  const count = await this.countDocuments();
  if (count > 0) return;

  const defaults = [
    { name: 'Roads & Infrastructure', code: 'road_department', description: 'Handles road damage, potholes, and infrastructure issues' },
    { name: 'Sanitation',             code: 'sanitation_department', description: 'Handles garbage, trash, and cleanliness issues' },
    { name: 'Electricity',            code: 'electricity_department', description: 'Handles street lights and electrical issues' },
    { name: 'Garden & Environment',   code: 'garden_department', description: 'Handles fallen trees, parks, and greenery' },
    { name: 'Enforcement',            code: 'enforcement_department', description: 'Handles illegal drawings, encroachments, and violations' },
  ];

  await this.insertMany(defaults);
  console.log('✅ Default departments seeded');
};

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
