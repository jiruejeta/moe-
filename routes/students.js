const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Department = require('../models/Department');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ---------- helper ----------
async function validateDepartmentAndClass(departmentId, classId) {
  if (!departmentId || !classId) {
    throw new Error('Both department and class are required');
  }

  const department = await Department.findById(departmentId);
  if (!department) throw new Error('Department not found');
  if (department.level !== 'main') throw new Error('Selected department is not a main department');

  const classDoc = await Department.findById(classId);
  if (!classDoc) throw new Error('Class not found');
  if (classDoc.level !== 'sub') throw new Error('Selected class is not a sub-department');

  if (!classDoc.parentId || classDoc.parentId.toString() !== department._id.toString()) {
    throw new Error('Selected class does not belong to the selected department');
  }

  return { department, class: classDoc };
}

// ---------- list ----------
router.get('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const filter = {};
    if (req.query.classId) filter.classId = req.query.classId;
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;

    const students = await Student.find(filter).sort({ createdAt: -1 }).select('-password');
    res.json(students);
  } catch (error) {
    console.error('GET students error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ---------- single ----------
router.get('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      blindStatus,
      departmentId,
      classId,
      enrollmentType,
      gender,
    } = req.body;

    if (!username || !password || !fullName || !gender) {
      return res.status(400).json({
        message: 'Missing required fields',
        required: ['username', 'password', 'fullName', 'gender'],
      });
    }

    let dept, cls;
    try {
      ({ department: dept, class: cls } = await validateDepartmentAndClass(departmentId, classId));
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const existing = await Student.findOne({ username: username.trim() });
    if (existing) {
      return res.status(400).json({ message: `Username "${username}" already exists` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await Student.create({
      username: username.trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      blindStatus: blindStatus || 'No',
      departmentId: dept._id,
      classId: cls._id,
      departmentName: dept.name,
      className: cls.name,
      enrollmentType: enrollmentType || 'Regular',
      gender,
    });

    res.status(201).json({
      message: 'Student created successfully',
      student: { ...student.toObject(), password: undefined },
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ---------- bulk ----------
router.post('/bulk', verifyToken, isAdmin, async (req, res) => {
  try {
    const { departmentId, classId, students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'students array is required' });
    }

    let dept, cls;
    try {
      ({ department: dept, class: cls } = await validateDepartmentAndClass(departmentId, classId));
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    const created = [];
    const failed = [];

    for (const s of students) {
      try {
        const { username, password, fullName, blindStatus, enrollmentType, gender } = s;

        if (!username || !password || !fullName || !gender) {
          failed.push({ username: username || '(missing)', reason: 'Missing required fields (username, password, fullName, gender)' });
          continue;
        }

        const exists = await Student.findOne({ username: username.trim() });
        if (exists) {
          failed.push({ username, reason: 'Username already exists' });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const student = await Student.create({
          username: username.trim(),
          password: hashedPassword,
          fullName: fullName.trim(),
          blindStatus: blindStatus || 'No',
          departmentId: dept._id,
          classId: cls._id,
          departmentName: dept.name,
          className: cls.name,
          enrollmentType: enrollmentType || 'Regular',
          gender,
        });

        created.push({ id: student._id, username: student.username, fullName: student.fullName });
      } catch (err) {
        failed.push({ username: s.username || '(missing)', reason: err.message });
      }
    }

    res.status(201).json({
      message: `Created ${created.length} student(s). ${failed.length} failed.`,
      createdCount: created.length,
      failedCount: failed.length,
      created,
      failed,
    });
  } catch (error) {
    console.error('Bulk create students error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ---------- update ----------
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    } else {
      delete updates.password;
    }

    if (updates.departmentId || updates.classId) {
      const existing = await Student.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Student not found' });

      const departmentId = updates.departmentId || existing.departmentId;
      const classId = updates.classId || existing.classId;

      let dept, cls;
      try {
        ({ department: dept, class: cls } = await validateDepartmentAndClass(departmentId, classId));
      } catch (err) {
        return res.status(400).json({ message: err.message });
      }

      updates.departmentId = dept._id;
      updates.classId = cls._id;
      updates.departmentName = dept.name;
      updates.className = cls.name;
    }

    const student = await Student.findByIdAndUpdate(req.params.id, updates, { new: true }).select('-password');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    res.json({ message: 'Student updated successfully', student });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ---------- delete ----------
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;