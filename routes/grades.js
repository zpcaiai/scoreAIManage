const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/database');

// Logger utility for grades routes
const logGrades = (action, details = {}) => {
  console.log(`[GRADES] ${new Date().toISOString()} - ${action}`, {
    ...details,
    path: '/api/grades',
    timestamp: new Date().toISOString()
  });
};

// GET /api/grades - Get all grades
router.get('/', async (req, res) => {
  logGrades('GET_ALL_GRADES', {
    query: req.query,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const { student_id, subject_id, exam_type, semester, academic_year } = req.query;
    
    let query = `
      SELECT g.*, s.student_name, sub.subject_name, c.class_name
      FROM grades g
      LEFT JOIN students s ON g.student_id = s.student_id
      LEFT JOIN subjects sub ON g.subject_id = sub.subject_id
      LEFT JOIN classes c ON s.class_id = c.class_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (student_id) {
      query += ` AND g.student_id = $${paramIndex++}`;
      params.push(student_id);
    }
    if (subject_id) {
      query += ` AND g.subject_id = $${paramIndex++}`;
      params.push(subject_id);
    }
    if (exam_type) {
      query += ` AND g.exam_type = $${paramIndex++}`;
      params.push(exam_type);
    }
    if (semester) {
      query += ` AND g.semester = $${paramIndex++}`;
      params.push(semester);
    }
    if (academic_year) {
      query += ` AND g.academic_year = $${paramIndex++}`;
      params.push(academic_year);
    }

    query += ' ORDER BY g.exam_date DESC, s.student_name';

    const result = await db.query(query, params);

    res.json({
      success: true,
      message: 'Grades retrieved successfully',
      data: result.rows,
      count: result.rowCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logGrades('GET_ALL_GRADES_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve grades',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/grades - Create new grade
router.post('/', async (req, res) => {
  logGrades('CREATE_GRADE', {
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const {
      student_id,
      subject_id,
      exam_type,
      exam_date,
      score,
      semester,
      academic_year,
      remarks
    } = req.body;

    const query = `
      INSERT INTO grades (
        student_id, subject_id, exam_type, exam_date,
        score, semester, academic_year, remarks
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(query, [
      student_id, subject_id, exam_type, exam_date,
      score, semester, academic_year, remarks
    ]);

    logGrades('CREATE_GRADE_SUCCESS', { gradeId: result.rows[0].grade_id });

    res.json({
      success: true,
      message: 'Grade created successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logGrades('CREATE_GRADE_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create grade',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/grades/:id - Get grade by ID
router.get('/:id', async (req, res) => {
  logGrades('GET_GRADE_BY_ID', {
    gradeId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = `
      SELECT g.*, s.student_name, sub.subject_name, c.class_name
      FROM grades g
      LEFT JOIN students s ON g.student_id = s.student_id
      LEFT JOIN subjects sub ON g.subject_id = sub.subject_id
      LEFT JOIN classes c ON s.class_id = c.class_id
      WHERE g.grade_id = $1
    `;

    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Grade retrieved successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logGrades('GET_GRADE_BY_ID_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve grade',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/grades/:id - Update grade
router.put('/:id', async (req, res) => {
  logGrades('UPDATE_GRADE', {
    gradeId: req.params.id,
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const {
      student_id,
      subject_id,
      exam_type,
      exam_date,
      score,
      semester,
      academic_year,
      remarks
    } = req.body;

    const query = `
      UPDATE grades SET
        student_id = $2,
        subject_id = $3,
        exam_type = $4,
        exam_date = $5,
        score = $6,
        semester = $7,
        academic_year = $8,
        remarks = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE grade_id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      req.params.id,
      student_id, subject_id, exam_type, exam_date,
      score, semester, academic_year, remarks
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found',
        timestamp: new Date().toISOString(),
      });
    }

    logGrades('UPDATE_GRADE_SUCCESS', { gradeId: req.params.id });

    res.json({
      success: true,
      message: 'Grade updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logGrades('UPDATE_GRADE_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update grade',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/grades/:id - Delete grade
router.delete('/:id', async (req, res) => {
  logGrades('DELETE_GRADE', {
    gradeId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'DELETE FROM grades WHERE grade_id = $1 RETURNING *';
    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Grade not found',
        timestamp: new Date().toISOString(),
      });
    }

    logGrades('DELETE_GRADE_SUCCESS', { gradeId: req.params.id });

    res.json({
      success: true,
      message: 'Grade deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logGrades('DELETE_GRADE_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete grade',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
