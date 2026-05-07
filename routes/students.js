const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/database');

// Logger utility for students routes
const logStudents = (action, details = {}) => {
  console.log(`[STUDENTS] ${new Date().toISOString()} - ${action}`, {
    ...details,
    path: '/api/students',
    timestamp: new Date().toISOString()
  });
};

// GET /api/students - Get all students
router.get('/', async (req, res) => {
  logStudents('GET_ALL_STUDENTS', {
    query: req.query,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const classId = req.query.class_id;
    
    let query = `
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.class_id
      WHERE s.is_active = true
    `;
    const params = [];

    if (classId) {
      query += ' AND s.class_id = $1';
      params.push(classId);
    }

    query += ' ORDER BY s.class_id, s.seat_number';

    const result = await db.query(query, params);

    res.json({
      success: true,
      message: 'Students retrieved successfully',
      data: result.rows,
      count: result.rowCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logStudents('GET_ALL_STUDENTS_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve students',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/students - Create new student
router.post('/', async (req, res) => {
  logStudents('CREATE_STUDENT', {
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const {
      student_number,
      student_name,
      class_id,
      seat_number,
      gender,
      birth_date,
      enrollment_date,
      phone,
      address,
      parent_name,
      parent_phone
    } = req.body;

    const query = `
      INSERT INTO students (
        student_number, student_name, class_id, seat_number,
        gender, birth_date, enrollment_date, phone, address,
        parent_name, parent_phone
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query(query, [
      student_number, student_name, class_id, seat_number,
      gender, birth_date, enrollment_date, phone, address,
      parent_name, parent_phone
    ]);

    logStudents('CREATE_STUDENT_SUCCESS', { studentId: result.rows[0].student_id });

    res.json({
      success: true,
      message: 'Student created successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logStudents('CREATE_STUDENT_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create student',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', async (req, res) => {
  logStudents('GET_STUDENT_BY_ID', {
    studentId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = `
      SELECT s.*, c.class_name 
      FROM students s 
      LEFT JOIN classes c ON s.class_id = c.class_id 
      WHERE s.student_id = $1
    `;

    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Student retrieved successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logStudents('GET_STUDENT_BY_ID_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve student',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/students/:id - Update student
router.put('/:id', async (req, res) => {
  logStudents('UPDATE_STUDENT', {
    studentId: req.params.id,
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const {
      student_number,
      student_name,
      class_id,
      seat_number,
      gender,
      birth_date,
      enrollment_date,
      phone,
      address,
      parent_name,
      parent_phone
    } = req.body;

    const query = `
      UPDATE students SET
        student_number = $2,
        student_name = $3,
        class_id = $4,
        seat_number = $5,
        gender = $6,
        birth_date = $7,
        enrollment_date = $8,
        phone = $9,
        address = $10,
        parent_name = $11,
        parent_phone = $12,
        updated_at = CURRENT_TIMESTAMP
      WHERE student_id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      req.params.id,
      student_number, student_name, class_id, seat_number,
      gender, birth_date, enrollment_date, phone, address,
      parent_name, parent_phone
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        timestamp: new Date().toISOString(),
      });
    }

    logStudents('UPDATE_STUDENT_SUCCESS', { studentId: req.params.id });

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logStudents('UPDATE_STUDENT_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update student',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/students/:id - Delete student
router.delete('/:id', async (req, res) => {
  logStudents('DELETE_STUDENT', {
    studentId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'UPDATE students SET is_active = false WHERE student_id = $1 RETURNING *';

    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
        timestamp: new Date().toISOString(),
      });
    }

    logStudents('DELETE_STUDENT_SUCCESS', { studentId: req.params.id });

    res.json({
      success: true,
      message: 'Student deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logStudents('DELETE_STUDENT_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete student',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
