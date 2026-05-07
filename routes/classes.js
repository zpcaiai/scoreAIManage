const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/database');

// Logger utility for classes routes
const logClasses = (action, details = {}) => {
  console.log(`[CLASSES] ${new Date().toISOString()} - ${action}`, {
    ...details,
    path: '/api/classes',
    timestamp: new Date().toISOString()
  });
};

// GET /api/classes - Get all classes
router.get('/', async (req, res) => {
  logClasses('GET_ALL_CLASSES', {
    query: req.query,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'SELECT * FROM classes ORDER BY grade_level, class_name';
    const result = await db.query(query);

    res.json({
      success: true,
      message: 'Classes retrieved successfully',
      data: result.rows,
      count: result.rowCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logClasses('GET_ALL_CLASSES_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve classes',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/classes - Create new class
router.post('/', async (req, res) => {
  logClasses('CREATE_CLASS', {
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const { class_name, grade_level, academic_year, class_teacher } = req.body;

    const query = `
      INSERT INTO classes (class_name, grade_level, academic_year, class_teacher)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [class_name, grade_level, academic_year, class_teacher]);

    logClasses('CREATE_CLASS_SUCCESS', { classId: result.rows[0].class_id });

    res.json({
      success: true,
      message: 'Class created successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logClasses('CREATE_CLASS_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create class',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/classes/:id - Get class by ID
router.get('/:id', async (req, res) => {
  logClasses('GET_CLASS_BY_ID', {
    classId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'SELECT * FROM classes WHERE class_id = $1';
    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Class retrieved successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logClasses('GET_CLASS_BY_ID_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve class',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/classes/:id - Update class
router.put('/:id', async (req, res) => {
  logClasses('UPDATE_CLASS', {
    classId: req.params.id,
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const { class_name, grade_level, academic_year, class_teacher } = req.body;

    const query = `
      UPDATE classes SET
        class_name = $2,
        grade_level = $3,
        academic_year = $4,
        class_teacher = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE class_id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      req.params.id,
      class_name, grade_level, academic_year, class_teacher
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
        timestamp: new Date().toISOString(),
      });
    }

    logClasses('UPDATE_CLASS_SUCCESS', { classId: req.params.id });

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logClasses('UPDATE_CLASS_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update class',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/classes/:id - Delete class
router.delete('/:id', async (req, res) => {
  logClasses('DELETE_CLASS', {
    classId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'DELETE FROM classes WHERE class_id = $1 RETURNING *';
    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Class not found',
        timestamp: new Date().toISOString(),
      });
    }

    logClasses('DELETE_CLASS_SUCCESS', { classId: req.params.id });

    res.json({
      success: true,
      message: 'Class deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logClasses('DELETE_CLASS_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete class',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
