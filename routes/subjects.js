const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/database');

// Logger utility for subjects routes
const logSubjects = (action, details = {}) => {
  console.log(`[SUBJECTS] ${new Date().toISOString()} - ${action}`, {
    ...details,
    path: '/api/subjects',
    timestamp: new Date().toISOString()
  });
};

// GET /api/subjects - Get all subjects
router.get('/', async (req, res) => {
  logSubjects('GET_ALL_SUBJECTS', {
    query: req.query,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'SELECT * FROM subjects WHERE is_active = true ORDER BY subject_code';
    const result = await db.query(query);

    res.json({
      success: true,
      message: 'Subjects retrieved successfully',
      data: result.rows,
      count: result.rowCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logSubjects('GET_ALL_SUBJECTS_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subjects',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/subjects - Create new subject
router.post('/', async (req, res) => {
  logSubjects('CREATE_SUBJECT', {
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const { subject_code, subject_name, subject_type, full_score } = req.body;

    const query = `
      INSERT INTO subjects (subject_code, subject_name, subject_type, full_score)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [subject_code, subject_name, subject_type, full_score]);

    logSubjects('CREATE_SUBJECT_SUCCESS', { subjectId: result.rows[0].subject_id });

    res.json({
      success: true,
      message: 'Subject created successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logSubjects('CREATE_SUBJECT_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create subject',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/subjects/:id - Get subject by ID
router.get('/:id', async (req, res) => {
  logSubjects('GET_SUBJECT_BY_ID', {
    subjectId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'SELECT * FROM subjects WHERE subject_id = $1';
    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Subject retrieved successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logSubjects('GET_SUBJECT_BY_ID_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve subject',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// PUT /api/subjects/:id - Update subject
router.put('/:id', async (req, res) => {
  logSubjects('UPDATE_SUBJECT', {
    subjectId: req.params.id,
    body: req.body,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const { subject_code, subject_name, subject_type, full_score, is_active } = req.body;

    const query = `
      UPDATE subjects SET
        subject_code = $2,
        subject_name = $3,
        subject_type = $4,
        full_score = $5,
        is_active = $6
      WHERE subject_id = $1
      RETURNING *
    `;

    const result = await db.query(query, [
      req.params.id,
      subject_code, subject_name, subject_type, full_score, is_active
    ]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
        timestamp: new Date().toISOString(),
      });
    }

    logSubjects('UPDATE_SUBJECT_SUCCESS', { subjectId: req.params.id });

    res.json({
      success: true,
      message: 'Subject updated successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logSubjects('UPDATE_SUBJECT_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update subject',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// DELETE /api/subjects/:id - Delete subject
router.delete('/:id', async (req, res) => {
  logSubjects('DELETE_SUBJECT', {
    subjectId: req.params.id,
    ip: req.ip
  });

  try {
    const db = getDatabase();
    const query = 'UPDATE subjects SET is_active = false WHERE subject_id = $1 RETURNING *';
    const result = await db.query(query, [req.params.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
        timestamp: new Date().toISOString(),
      });
    }

    logSubjects('DELETE_SUBJECT_SUCCESS', { subjectId: req.params.id });

    res.json({
      success: true,
      message: 'Subject deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logSubjects('DELETE_SUBJECT_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete subject',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
