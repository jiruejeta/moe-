const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Get all departments
router.get('/', verifyToken, async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    res.json(departments);
  } catch (error) {
    console.error('GET departments error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create department (Admin only)
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('Received department data:', req.body); // Debug log
    
    const { name, code, description } = req.body;
    
    // Validation
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }
    
    // Check if department exists
    const existingDept = await Department.findOne({ 
      $or: [{ name: name }, { code: code }] 
    });
    
    if (existingDept) {
      return res.status(400).json({ 
        message: 'Department name or code already exists' 
      });
    }
    
    // Create department
    const department = await Department.create({
      name: name,
      code: code.toUpperCase(),
      description: description || '',
    });
    
    console.log('Department created:', department); // Debug log
    res.status(201).json(department);
    
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: error.stack 
    });
  }
});

// Update department
router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );
    
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete department
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;