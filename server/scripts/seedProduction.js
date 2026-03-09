/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   PRODUCTION DATABASE SEED SCRIPT                           ║
 * ║   Seeds departments, heads, and officers into production    ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * This script:
 *  1. Removes OLD departments (Electricity, Enforcement, Garden & Environment,
 *     Roads & Infrastructure, Sanitation) that have no subcategories/SLA.
 *  2. Removes OLD officials (department_head + officer) linked to those depts.
 *  3. Creates the CORRECT departments with subcategories + SLA.
 *  4. Creates department heads + officers with password 'Pass@123'
 *     (hashed automatically by the Admin model pre-save hook).
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." node scripts/seedProduction.js
 *
 * Or set MONGODB_URI in server/.env and run:
 *   node scripts/seedProduction.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Admin      = require('../models/Admin');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DEFAULT_PASSWORD = 'Pass@123';

// ─── Helper ─────────────────────────────────────────────────────────
function log(msg) { console.log(msg); }
function section(title) { console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`); }

// ─── Permissions ────────────────────────────────────────────────────
const HEAD_PERMISSIONS = {
  canViewComplaints: true,
  canUpdateStatus:   true,
  canAssignComplaints: true,
  canDeleteComplaints: false,
  canManageAdmins:   false,
  canViewAnalytics:  true,
  canExportData:     true,
};
const OFFICER_PERMISSIONS = {
  canViewComplaints: true,
  canUpdateStatus:   true,
  canAssignComplaints: false,
  canDeleteComplaints: false,
  canManageAdmins:   false,
  canViewAnalytics:  false,
  canExportData:     false,
};

// ════════════════════════════════════════════════════════════════════
//  DATA — 5 Departments, 4 Heads, 44 Officers
// ════════════════════════════════════════════════════════════════════

const DEPARTMENTS = [
  {
    name: 'Road Department (PWD)',
    code: 'road_department',
    description: 'Public Works Department — handles road damage, potholes, signage, dividers, manholes, and infrastructure issues',
    priority: 'medium',
    subcategories: [
      { name: 'Pothole', sla: '2-3 Days' },
      { name: 'Surface Damage', sla: '7-15 Days' },
      { name: 'Speed Breaker Repair', sla: '3-7 Days' },
      { name: 'Missing Road Signboard', sla: '3-5 Days' },
      { name: 'Divider Damage', sla: '7-15 Days' },
      { name: 'Manhole Cover Damage', sla: '1-3 Days' },
      { name: 'Road Marking / Zebra Crossing', sla: '7-15 Days' },
    ],
    head: {
      name: 'Er. Rajesh Deshmukh',
      email: 'rajesh.d@gmail.com',
      phone: '9876500001',
      designation: 'Road Department / PWD Head',
    },
    officers: [
      { name: 'Er. Amit Kulkarni',  email: 'amitk@gmail.com',    phone: '9876500002', designation: 'Executive Engineer' },
      { name: 'Er. Pravin Patil',   email: 'pravinp@gmail.com',  phone: '9876500003', designation: 'Executive Engineer' },
      { name: 'Er. Sneha Joshi',    email: 'snehaj@gmail.com',   phone: '9876500004', designation: 'Assistant Engineer' },
      { name: 'Er. Nikhil Shinde',  email: 'nikhils@gmail.com',  phone: '9876500005', designation: 'Assistant Engineer' },
      { name: 'Er. Rohan Wankhede', email: 'rohanw@gmail.com',   phone: '9876500006', designation: 'Junior Engineer' },
      { name: 'Er. Pooja Kale',     email: 'poojak@gmail.com',   phone: '9876500007', designation: 'Junior Engineer' },
      { name: 'Mahesh Pawar',       email: 'maheshp@gmail.com',  phone: '9876500008', designation: 'Section Officer' },
      { name: 'Ganesh More',        email: 'ganeshm@gmail.com',  phone: '9876500009', designation: 'Section Officer' },
      { name: 'Suresh Thakre',      email: 'suresht@gmail.com',  phone: '9876500010', designation: 'Senior Clerk' },
      { name: 'Kavita Bhosale',     email: 'kavitab@gmail.com',  phone: '9876500011', designation: 'Clerk' },
      { name: 'Rahul Gawande',      email: 'rahulg@gmail.com',   phone: '9876500012', designation: 'Clerk' },
      { name: 'Neha Ingle',         email: 'nehai@gmail.com',    phone: '9876500013', designation: 'Clerk' },
    ],
  },
  {
    name: 'Sanitation Department',
    code: 'sanitation_department',
    description: 'Solid Waste Management & Sanitation — handles garbage, drainage, public toilets, waterlogging, pest control',
    priority: 'medium',
    subcategories: [
      { name: 'Garbage Not Collected', sla: '1-2 Days' },
      { name: 'Drainage Blockage', sla: '2-4 Days' },
      { name: 'Dead Animal Removal', sla: 'Same Day' },
      { name: 'Public Toilet Cleaning', sla: '1 Day' },
      { name: 'Water Logging (Minor)', sla: '2-5 Days' },
      { name: 'Open Drain Cleaning', sla: '2-5 Days' },
      { name: 'Mosquito Breeding Issue', sla: '2-3 Days' },
      { name: 'Broken Dustbin Replacement', sla: '3-7 Days' },
    ],
    head: {
      name: 'Dr. Sunil Patwardhan',
      email: 'sunilp@gmail.com',
      phone: '9876500101',
      designation: 'Health Officer / Sanitation Head',
    },
    officers: [
      { name: 'Dr. Meena Tiwari',  email: 'meenat@gmail.com',    phone: '9876500102', designation: 'Executive Health Officer' },
      { name: 'Dr. Ajay Ingole',   email: 'ajayi@gmail.com',     phone: '9876500103', designation: 'Assistant Health Officer' },
      { name: 'Rakesh Jadhav',     email: 'rakeshj@gmail.com',   phone: '9876500104', designation: 'Sanitary Inspector' },
      { name: 'Lata Bhure',        email: 'latab@gmail.com',     phone: '9876500105', designation: 'Sanitary Inspector' },
      { name: 'Shailesh Pande',    email: 'shaileshp@gmail.com', phone: '9876500106', designation: 'Ward Supervisor' },
      { name: 'Pritam Dange',      email: 'pritamd@gmail.com',   phone: '9876500107', designation: 'Ward Supervisor' },
      { name: 'Sagar Kadu',        email: 'sagark@gmail.com',    phone: '9876500108', designation: 'Field Officer' },
      { name: 'Komal Mahalle',     email: 'komalm@gmail.com',    phone: '9876500109', designation: 'Field Officer' },
      { name: 'Vijay Waghmare',    email: 'vijayw@gmail.com',    phone: '9876500110', designation: 'Senior Clerk' },
      { name: 'Aarti Rathod',      email: 'aartir@gmail.com',    phone: '9876500111', designation: 'Clerk' },
      { name: 'Deepak Meshram',    email: 'deepakm@gmail.com',   phone: '9876500112', designation: 'Clerk' },
      { name: 'Swati Rode',        email: 'swatir@gmail.com',    phone: '9876500113', designation: 'Clerk' },
    ],
  },
  {
    name: 'Electricity Department',
    code: 'electricity_department',
    description: 'Street Light & Electrical Department — handles street lights, wiring, poles, transformers, cables',
    priority: 'medium',
    subcategories: [
      { name: 'Street Light Not Working', sla: '2-3 Days' },
      { name: 'Open/Loose Electric Wire', sla: 'Same Day' },
      { name: 'Electric Pole Damage', sla: '3-7 Days' },
      { name: 'Transformer Issue', sla: '1-3 Days' },
      { name: 'Cable Fault', sla: '1-3 Days' },
    ],
    head: {
      name: 'Er. Vivek Bhandari',
      email: 'vivekb@gmail.com',
      phone: '9876500201',
      designation: 'Electrical Engineer / Dept Head',
    },
    officers: [
      { name: 'Er. Manoj Kapse',     email: 'manojk@gmail.com',    phone: '9876500202', designation: 'Executive Engineer' },
      { name: 'Er. Priyanka Dhore',  email: 'priyankad@gmail.com', phone: '9876500203', designation: 'Assistant Engineer' },
      { name: 'Er. Hemant Barve',    email: 'hemantb@gmail.com',   phone: '9876500204', designation: 'Assistant Engineer' },
      { name: 'Er. Akash Bhagat',    email: 'akashb@gmail.com',    phone: '9876500205', designation: 'Junior Engineer' },
      { name: 'Er. Shweta Raut',     email: 'shwetar@gmail.com',   phone: '9876500206', designation: 'Junior Engineer' },
      { name: 'Sanjay Kothari',      email: 'sanjayk@gmail.com',   phone: '9876500207', designation: 'Electrical Inspector' },
      { name: 'Nitin Dhok',          email: 'nitind@gmail.com',    phone: '9876500208', designation: 'Line Supervisor' },
      { name: 'Amol Rane',           email: 'amolr@gmail.com',     phone: '9876500209', designation: 'Line Supervisor' },
      { name: 'Prakash Bhalerao',    email: 'prakashb@gmail.com',  phone: '9876500210', designation: 'Senior Clerk' },
      { name: 'Seema Yadav',         email: 'seemay@gmail.com',    phone: '9876500211', designation: 'Clerk' },
      { name: 'Rohit Khandekar',     email: 'rohitk@gmail.com',    phone: '9876500212', designation: 'Clerk' },
      { name: 'Anita Korde',         email: 'anitak@gmail.com',    phone: '9876500213', designation: 'Clerk' },
      { name: 'Sandeep More',        email: 'sandeepm@gmail.com',  phone: '9876500214', designation: 'Technician' },
      { name: 'Yogesh Patil',        email: 'yogeshp@gmail.com',   phone: '9876500215', designation: 'Technician' },
    ],
  },
  {
    name: 'Garden / Tree Department',
    code: 'garden_tree_department',
    description: 'this is the nature where',
    priority: 'medium',
    subcategories: [
      { name: 'Fallen Trees', sla: '1-2 Days' },
    ],
    head: {
      name: 'Yuvraj Bhatkar',
      email: 'yuvi@gmail.com',
      phone: '7767055408',
      designation: 'Senior Officer',
    },
    officers: [
      { name: 'Rushikesh barwat', email: 'rushi@gmail.com', phone: '1478523698', designation: 'fild officer' },
      { name: 'Shrikan Sonikar', email: 'shri@gmail.com',  phone: '1452147856', designation: 'officer', employeeId: 'EMA-100' },
    ],
  },
  {
    name: 'Drainage & Water Department',
    code: 'drainage_water_department',
    description: 'water releted problam',
    priority: 'high',
    subcategories: [
      { name: 'Drainage Blockage', sla: '1 Day' },
      { name: 'Open Drain', sla: 'Same Day' },
      { name: 'Water Logging', sla: '1-2 Days' },
      { name: 'Manhole Cover Damage', sla: '2-5 Days' },
    ],
    head: null, // no head assigned yet
    officers: [],
  },
];

// ════════════════════════════════════════════════════════════════════
//  MAIN
// ════════════════════════════════════════════════════════════════════

async function run() {
  if (!MONGO_URI) {
    console.error('❌ MONGODB_URI not set. Either:\n  1. Set it in server/.env\n  2. Run with: MONGODB_URI="mongodb+srv://..." node scripts/seedProduction.js');
    process.exit(1);
  }

  // Safety: confirm we're targeting the right DB
  const dbName = MONGO_URI.match(/\/([^/?]+)(\?|$)/)?.[1] || 'unknown';
  log(`\n🔗 Connecting to: ${MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);
  log(`📦 Database: ${dbName}`);

  await mongoose.connect(MONGO_URI);
  log('✅ Connected\n');

  const summary = { deptsDeleted: 0, officialsDeleted: 0, deptsCreated: 0, headsCreated: 0, officersCreated: 0, errors: [] };

  // ── Step 1: Remove OLD departments ─────────────────────────────
  section('STEP 1 — Remove old departments');

  const oldCodes = [
    'electricity_department', 'enforcement_department', 'garden_department',
    'road_department', 'sanitation_department', 'garden_tree_department',
    'drainage_water_department',
  ];

  const delDepts = await Department.deleteMany({ code: { $in: oldCodes } });
  summary.deptsDeleted = delDepts.deletedCount;
  log(`  Deleted ${delDepts.deletedCount} old department(s)`);

  // Also delete any department not in our new list (catch-all for renamed ones)
  const newCodes = DEPARTMENTS.map(d => d.code);
  const extraDel = await Department.deleteMany({ code: { $nin: newCodes } });
  if (extraDel.deletedCount > 0) {
    log(`  Deleted ${extraDel.deletedCount} extra department(s) not in seed list`);
    summary.deptsDeleted += extraDel.deletedCount;
  }

  // ── Step 2: Remove OLD officials ───────────────────────────────
  section('STEP 2 — Remove old department_head & officer accounts');

  const delOfficials = await Admin.deleteMany({ role: { $in: ['department_head', 'officer'] } });
  summary.officialsDeleted = delOfficials.deletedCount;
  log(`  Deleted ${delOfficials.deletedCount} old official(s)`);
  log(`  ⚠️  super_admin accounts are NOT touched`);

  // ── Step 3: Create new departments ─────────────────────────────
  section('STEP 3 — Create departments');

  const deptMap = {}; // code → Department doc

  for (const dept of DEPARTMENTS) {
    try {
      const newDept = await Department.create({
        name: dept.name,
        code: dept.code,
        description: dept.description,
        headName: dept.head?.name || '',
        headEmail: dept.head?.email || '',
        headPhone: dept.head?.phone || '',
        supportedCategories: dept.subcategories,
        priority: dept.priority,
        isActive: true,
      });
      deptMap[dept.code] = newDept;
      summary.deptsCreated++;
      log(`  ✅ ${dept.name}  (${dept.code}) — ${dept.subcategories.length} subcategories`);
    } catch (err) {
      const msg = `Failed: ${dept.code} — ${err.message}`;
      summary.errors.push(msg);
      log(`  ❌ ${msg}`);
    }
  }

  // ── Step 4: Create department heads ────────────────────────────
  section('STEP 4 — Create department heads');

  for (const dept of DEPARTMENTS) {
    if (!dept.head) { log(`  ⏭️  ${dept.code} — no head`); continue; }
    const deptDoc = deptMap[dept.code];
    try {
      await Admin.create({
        name:           dept.head.name,
        email:          dept.head.email,
        password:       DEFAULT_PASSWORD,  // hashed by pre-save hook
        phone:          dept.head.phone,
        role:           'department_head',
        department:     dept.code,
        departmentCode: dept.code,
        departmentRef:  deptDoc?._id,
        designation:    dept.head.designation,
        isActive:       true,
        permissions:    HEAD_PERMISSIONS,
      });
      summary.headsCreated++;
      log(`  ✅ HEAD  ${dept.head.name}  <${dept.head.email}>  dept=${dept.code}`);
    } catch (err) {
      const msg = `Head ${dept.head.email}: ${err.message}`;
      summary.errors.push(msg);
      log(`  ❌ ${msg}`);
    }
  }

  // ── Step 5: Create officers ────────────────────────────────────
  section('STEP 5 — Create officers');

  for (const dept of DEPARTMENTS) {
    if (!dept.officers.length) { log(`  ⏭️  ${dept.code} — no officers`); continue; }
    const deptDoc = deptMap[dept.code];
    log(`\n  📂 ${dept.name} (${dept.officers.length} officers)`);

    for (const officer of dept.officers) {
      try {
        await Admin.create({
          name:           officer.name,
          email:          officer.email,
          password:       DEFAULT_PASSWORD,  // hashed by pre-save hook
          phone:          officer.phone,
          role:           'officer',
          department:     dept.code,
          departmentCode: dept.code,
          departmentRef:  deptDoc?._id,
          designation:    officer.designation,
          employeeId:     officer.employeeId || '',
          isActive:       true,
          permissions:    OFFICER_PERMISSIONS,
        });
        summary.officersCreated++;
        log(`     ✅ ${officer.designation.padEnd(26)} ${officer.name.padEnd(24)} <${officer.email}>`);
      } catch (err) {
        const msg = `Officer ${officer.email}: ${err.message}`;
        summary.errors.push(msg);
        log(`     ❌ ${msg}`);
      }
    }
  }

  // ── Summary ────────────────────────────────────────────────────
  section('SUMMARY');
  log(`  Departments deleted:  ${summary.deptsDeleted}`);
  log(`  Officials deleted:    ${summary.officialsDeleted}`);
  log(`  Departments created:  ${summary.deptsCreated}`);
  log(`  Dept heads created:   ${summary.headsCreated}`);
  log(`  Officers created:     ${summary.officersCreated}`);
  log(`  Errors:               ${summary.errors.length}`);
  if (summary.errors.length) {
    summary.errors.forEach(e => log(`    ⚠️  ${e}`));
  }
  log(`\n  🔑 Default password for all officials: ${DEFAULT_PASSWORD}`);
  log(`  🔑 Super admin account: unchanged\n`);

  await mongoose.connection.close();
}

run().catch(e => { console.error('Fatal:', e); process.exit(1); });
