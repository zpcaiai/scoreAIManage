const express = require('express');
const router = express.Router();

// Mock subjects routes for deployment
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Subjects list endpoint - implementation needed',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

router.post('/', (req, res) => {
  res.json({
    success: true,
    message: 'Create subject endpoint - implementation needed',
    timestamp: new Date().toISOString(),
  });
});

router.get('/:id', (req, res) => {
  res.json({
    success: true,
    message: `Get subject ${req.params.id} endpoint - implementation needed`,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
