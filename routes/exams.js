const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/database');

// Logger utility for exams routes
const logExams = (action, details = {}) => {
  console.log(`[EXAMS] ${new Date().toISOString()} - ${action}`, {
    ...details,
    path: '/api/exams',
    timestamp: new Date().toISOString()
  });
};

// GET /api/exams - Get all exams
router.get('/', async (req, res) => {
  logExams('GET_ALL_EXAMS', {
    query: req.query,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'SELECT * FROM exams WHERE is_active = true ORDER BY start_date DESC';
    const result = await db.query(query);

    res.json({
      success: true,
      message: 'Exams retrieved successfully',
      data: result.rows,
      count: result.rowCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logExams('GET_ALL_EXAMS_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve exams',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/exams - Create new exam
router.post('/', async (req, res) => {
  logExams('CREATE_EXAM', {
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const { exam_name, exam_type, semester, academic_year, start_date, end_date } = req.body;

    const query = `
      INSERT INTO exams (exam_name, exam_type, semester, academic_year, start_date, end_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await db.query(query, [
      exam_name, exam_type, semester, academic_year, start_date, end_date
    ]);

    logExams('CREATE_EXAM_SUCCESS', { examId: result.rows[0].exam_id });

    res.json({
      success: true,
      message: 'Exam created successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logExams('CREATE_EXAM_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create exam',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/exams/:id - Get exam by ID
router.get('/:id', async (req, res) => {
  logExams('GET_EXAM_BY_ID', {
    examId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'SELECT * FROM exams WHERE exam_id = $1';
    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Exam retrieved successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logExams('GET_EXAM_BY_ID_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve exam',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/exams/:id - Update exam
router.put('/:id', async (req, res) => {
  logExams('UPDATE_EXAM', {
    examId: req.params.id,
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const { exam_name, exam_type, semester, academic_year, start_date, end_date, is_active } = req.body;

    const query = `
      UPDATE exams SET
        exam_name = $2,
        exam_type = $3,
        semester = $4,
        academic_year = $5,
        start_date = $6,
        end_date = $7,
        is_active = $8
      WHERE exam_id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      req.params.id,
      exam_name, exam_type, semester, academic_year, start_date, end_date, is_active
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
        timestamp: new Date().toISOString(),
      });
    }

    logExams('UPDATE_EXAM_SUCCESS', { examId: req.params.id });

    res.json({
      success: true,
      message: 'Exam updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logExams('UPDATE_EXAM_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update exam',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/exams/:id - Delete exam
router.delete('/:id', async (req, res) => {
  logExams('DELETE_EXAM', {
    examId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'UPDATE exams SET is_active = false WHERE exam_id = $1 RETURNING *';
    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Exam not found',
        timestamp: new Date().toISOString(),
      });
    }

    logExams('DELETE_EXAM_SUCCESS', { examId: req.params.id });

    res.json({
      success: true,
      message: 'Exam deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logExams('DELETE_EXAM_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete exam',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
