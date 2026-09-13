console.log('🔵🔵🔵 DEPARTMENTS ROUTE IS BEING LOADED 🔵🔵🔵');

const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { verifyToken, isAdmin } = require('../middleware/auth');

// ============================================================
// GET ALL DEPARTMENTS (WITH HIERARCHY)
// ============================================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const mainDepartments = await Department.find({ level: 'main' })
      .sort({ name: 1 })
      .lean();

    const subDepartments = await Department.find({ level: 'sub' })
      .sort({ name: 1 })
      .lean();

    console.log('🔍 Main count:', mainDepartments.length);
    console.log('🔍 Sub count:', subDepartments.length);

    const mainMap = new Map(
      mainDepartments.map((main) => [
        main._id.toString(),
        {
          ...main,
          children: [],
        },
      ])
    );

    const orphans = [];

    for (const sub of subDepartments) {
      const parentKey = sub.parentId
        ? sub.parentId.toString()
        : null;

      const parent = parentKey
        ? mainMap.get(parentKey)
        : null;

      if (parent) {
        parent.children.push(sub);
      } else {
        console.warn(
          `⚠️ Orphaned sub-department: "${sub.name}" (${sub._id}) parentId=${sub.parentId}`
        );

        orphans.push({
          ...sub,
          _orphaned: true,
        });
      }
    }

    const result = [...mainMap.values()];

    res.json({
      departments: result,
      orphans,
    });
  } catch (error) {
    console.error('❌ GET departments error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
});

// ============================================================
// GET ALL DEPARTMENTS (FLAT LIST)
// ============================================================
router.get('/flat', verifyToken, async (req, res) => {
  try {
    const departments = await Department.find()
      .sort({ level: -1, name: 1 })
      .lean();

    res.json(departments);
  } catch (error) {
    console.error('❌ GET flat departments error:', error);

    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
});

// ============================================================
// CREATE DEPARTMENT
// ============================================================
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      parentId,
      level,
    } = req.body;

    // --------------------------------------------------------
    // DEBUG: SHOW EXACT DATA RECEIVED FROM FRONTEND
    // --------------------------------------------------------
    console.log('');
    console.log('========================================');
    console.log('📝 CREATE DEPARTMENT REQUEST');
    console.log('========================================');
    console.log('Name:', name);
    console.log('Code:', code);
    console.log('Description:', description);
    console.log('Parent ID:', parentId);
    console.log('Level:', level);
    console.log('Full body:', req.body);
    console.log('========================================');

    // --------------------------------------------------------
    // VALIDATE NAME AND CODE
    // --------------------------------------------------------
    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Department name is required',
      });
    }

    if (!code || !code.trim()) {
      return res.status(400).json({
        message: 'Department code is required',
      });
    }

    // --------------------------------------------------------
    // IMPORTANT:
    // NEVER AUTOMATICALLY CHANGE MISSING LEVEL TO "main"
    // --------------------------------------------------------
    if (!level) {
      console.error('❌ LEVEL IS MISSING');

      return res.status(400).json({
        message: 'Department level is required. Use "main" or "sub".',
      });
    }

    if (level !== 'main' && level !== 'sub') {
      console.error('❌ INVALID LEVEL:', level);

      return res.status(400).json({
        message: `Invalid department level "${level}". Use "main" or "sub".`,
      });
    }

    // --------------------------------------------------------
    // NORMALIZE VALUES
    // --------------------------------------------------------
    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    console.log('📌 Clean name:', cleanName);
    console.log('📌 Clean code:', cleanCode);
    console.log('📌 Level to save:', level);

    // --------------------------------------------------------
    // CHECK DUPLICATE NAME OR CODE
    // --------------------------------------------------------
    const existingDept = await Department.findOne({
      $or: [
        { name: cleanName },
        { code: cleanCode },
      ],
    });

    if (existingDept) {
      return res.status(400).json({
        message: 'Department name or code already exists',
      });
    }

    // --------------------------------------------------------
    // PREPARE DEPARTMENT DATA
    // --------------------------------------------------------
    const departmentData = {
      name: cleanName,
      code: cleanCode,
      description: description || '',
      level: level,
      parentId: null,
    };

    // --------------------------------------------------------
    // IF THIS IS A SUB-DEPARTMENT / CLASS
    // --------------------------------------------------------
    if (level === 'sub') {
      console.log('🔵 Creating SUB-DEPARTMENT / CLASS');

      // Parent is REQUIRED
      if (!parentId) {
        return res.status(400).json({
          message:
            'Parent department is required for sub-departments',
        });
      }

      // Validate ObjectId
      if (!require('mongoose').Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({
          message: 'Invalid parent department ID',
        });
      }

      // Find parent
      const parent = await Department.findById(parentId);

      if (!parent) {
        return res.status(404).json({
          message: 'Parent department not found',
        });
      }

      // Parent MUST be main
      if (parent.level !== 'main') {
        return res.status(400).json({
          message:
            'Sub-departments can only be created under main departments',
        });
      }

      // Set parent
      departmentData.parentId = parent._id;

      console.log('✅ Parent validated');
      console.log('   Parent name:', parent.name);
      console.log('   Parent ID:', parent._id);
      console.log('   Parent level:', parent.level);
    }

    // --------------------------------------------------------
    // IF THIS IS A MAIN DEPARTMENT
    // --------------------------------------------------------
    if (level === 'main') {
      console.log('🟢 Creating MAIN DEPARTMENT');

      // Main departments MUST NOT have a parent
      departmentData.parentId = null;
    }

    // --------------------------------------------------------
    // SHOW EXACT DATA BEFORE SAVING
    // --------------------------------------------------------
    console.log('');
    console.log('📦 DATA GOING TO MONGODB:');
    console.log(departmentData);
    console.log('');

    // --------------------------------------------------------
    // CREATE
    // --------------------------------------------------------
    const department = await Department.create(
      departmentData
    );

    // --------------------------------------------------------
    // VERIFY WHAT MONGODB ACTUALLY SAVED
    // --------------------------------------------------------
    console.log('');
    console.log('✅ DEPARTMENT CREATED SUCCESSFULLY');
    console.log('========================================');
    console.log('ID:', department._id);
    console.log('Name:', department.name);
    console.log('Code:', department.code);
    console.log('Level:', department.level);
    console.log('Parent:', department.parentId || 'None');
    console.log('========================================');
    console.log('');

    res.status(201).json(department);

  } catch (error) {
    console.error('');
    console.error('❌ CREATE DEPARTMENT ERROR');
    console.error(error);
    console.error('');

    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
});

// ============================================================
// UPDATE DEPARTMENT
// ============================================================
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      parentId,
      level,
    } = req.body;

    console.log('');
    console.log('========================================');
    console.log('📝 UPDATE DEPARTMENT REQUEST');
    console.log('========================================');
    console.log('ID:', req.params.id);
    console.log('Name:', name);
    console.log('Code:', code);
    console.log('Description:', description);
    console.log('Parent ID:', parentId);
    console.log('Level:', level);
    console.log('========================================');

    // --------------------------------------------------------
    // FIND DEPARTMENT
    // --------------------------------------------------------
    const department = await Department.findById(
      req.params.id
    );

    if (!department) {
      return res.status(404).json({
        message: 'Department not found',
      });
    }

    console.log(
      `📌 Current level: "${department.level}"`
    );

    // --------------------------------------------------------
    // VALIDATE LEVEL
    // --------------------------------------------------------
    const finalLevel =
      level !== undefined
        ? level
        : department.level;

    if (
      finalLevel !== 'main' &&
      finalLevel !== 'sub'
    ) {
      return res.status(400).json({
        message:
          'Level must be either "main" or "sub"',
      });
    }

    console.log(
      `📌 New level: "${finalLevel}"`
    );

    // --------------------------------------------------------
    // PREVENT MAIN → SUB IF IT HAS CHILDREN
    // --------------------------------------------------------
    if (
      finalLevel === 'sub' &&
      department.level === 'main'
    ) {
      const hasChildren =
        await Department.exists({
          parentId: req.params.id,
        });

      if (hasChildren) {
        return res.status(400).json({
          message:
            'Cannot convert this main department to a sub-department because it still has classes under it. Delete or reassign the classes first.',
        });
      }
    }

    // --------------------------------------------------------
    // PREPARE UPDATE DATA
    // --------------------------------------------------------
    const updateData = {
      name:
        name !== undefined
          ? name.trim()
          : department.name,

      code:
        code !== undefined
          ? code.trim().toUpperCase()
          : department.code,

      description:
        description !== undefined
          ? description
          : department.description,

      level: finalLevel,

      parentId: null,
    };

    // --------------------------------------------------------
    // UPDATE TO SUB
    // --------------------------------------------------------
    if (finalLevel === 'sub') {
      console.log(
        '🔵 Updating as SUB-DEPARTMENT / CLASS'
      );

      if (!parentId) {
        return res.status(400).json({
          message:
            'Parent department is required for sub-departments',
        });
      }

      // Validate parent ID
      if (
        !require('mongoose').Types.ObjectId.isValid(
          parentId
        )
      ) {
        return res.status(400).json({
          message:
            'Invalid parent department ID',
        });
      }

      // Prevent itself as parent
      if (parentId === req.params.id) {
        return res.status(400).json({
          message:
            'Cannot set a department as its own parent',
        });
      }

      const parent =
        await Department.findById(parentId);

      if (!parent) {
        return res.status(404).json({
          message:
            'Parent department not found',
        });
      }

      if (parent.level !== 'main') {
        return res.status(400).json({
          message:
            'Sub-departments can only be under main departments',
        });
      }

      updateData.parentId = parent._id;

      console.log(
        `✅ Parent validated: ${parent.name}`
      );
    }

    // --------------------------------------------------------
    // UPDATE TO MAIN
    // --------------------------------------------------------
    if (finalLevel === 'main') {
      console.log(
        '🟢 Updating as MAIN DEPARTMENT'
      );

      const hasChildren =
        await Department.exists({
          parentId: req.params.id,
        });

      if (hasChildren) {
        return res.status(400).json({
          message:
            'Cannot make this a main department while it has classes under it.',
        });
      }

      updateData.parentId = null;
    }

    // --------------------------------------------------------
    // SAVE UPDATE
    // --------------------------------------------------------
    const updatedDepartment =
      await Department.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      );

    if (!updatedDepartment) {
      return res.status(404).json({
        message:
          'Department not found after update',
      });
    }

    console.log('');
    console.log('✅ DEPARTMENT UPDATED');
    console.log('========================================');
    console.log(
      'Name:',
      updatedDepartment.name
    );
    console.log(
      'Code:',
      updatedDepartment.code
    );
    console.log(
      'Level:',
      updatedDepartment.level
    );
    console.log(
      'Parent:',
      updatedDepartment.parentId || 'None'
    );
    console.log('========================================');
    console.log('');

    res.json(updatedDepartment);

  } catch (error) {
    console.error('');
    console.error('❌ UPDATE DEPARTMENT ERROR');
    console.error(error);
    console.error('');

    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
});

// ============================================================
// DELETE DEPARTMENT
// ============================================================
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const departmentId = req.params.id;

    console.log(
      `🗑️ DELETE department: ${departmentId}`
    );

    const department =
      await Department.findById(departmentId);

    if (!department) {
      return res.status(404).json({
        message: 'Department not found',
      });
    }

    // --------------------------------------------------------
    // CHECK CHILDREN
    // --------------------------------------------------------
    const subDepartments =
      await Department.find({
        parentId: departmentId,
      });

    if (subDepartments.length > 0) {
      const subNames =
        subDepartments
          .map((d) => d.name)
          .join(', ');

      return res.status(400).json({
        message:
          `Cannot delete "${department.name}" because it has ${subDepartments.length} sub-department(s): ${subNames}. Please delete them first.`,

        subDepartments:
          subDepartments.map((d) => ({
            id: d._id,
            name: d.name,
            code: d.code,
          })),
      });
    }

    // --------------------------------------------------------
    // DELETE
    // --------------------------------------------------------
    await Department.findByIdAndDelete(
      departmentId
    );

    console.log(
      `✅ Department "${department.name}" deleted`
    );

    res.json({
      message:
        `Department "${department.name}" deleted successfully`,
    });

  } catch (error) {
    console.error(
      '❌ Delete department error:',
      error
    );

    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
});

// ============================================================
// EXPORT ROUTER
// ============================================================
module.exports = router;