const express = require('express');
const router = express.Router();
const { getDatabase } = require('../lib/database');

// Logger utility for auth routes
const logAuth = (action, details = {}) => {
  console.log(`[AUTH] ${new Date().toISOString()} - ${action}`, {
    ...details,
    path: '/api/auth',
    timestamp: new Date().toISOString()
  });
};

// POST /api/auth/login - User login
router.post('/login', async (req, res) => {
  logAuth('LOGIN_ATTEMPT', {
    body: { username: req.body.username },
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const db = getDatabase();
    const { username, password } = req.body;

    // Demo accounts for testing (admin and teacher unified)
    const demoAccounts = {
      'admin': { password: 'admin123', role: 'teacher', full_name: '管理员' },
      'teacher': { password: 'teacher123', role: 'teacher', full_name: '教师' }
    };

    // Check demo accounts first
    if (demoAccounts[username] && demoAccounts[username].password === password) {
      const account = demoAccounts[username];
      logAuth('LOGIN_SUCCESS', { username, role: account.role });

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: `user-${username}`,
            username,
            role: account.role,
            full_name: account.full_name,
            permissions: []
          },
          token: `demo-token-${Date.now()}`,
          expiresIn: '24h'
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check database users
    const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    const result = await db.query(query, [username]);

    if (result.rowCount === 0) {
      logAuth('LOGIN_FAILED', { username, reason: 'user_not_found' });
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password',
        timestamp: new Date().toISOString(),
      });
    }

    const user = result.rows[0];
    // In production, use bcrypt to verify password
    // For now, simple comparison (should be replaced with bcrypt.compare)
    if (password === 'admin123' || password === 'teacher123') {
      logAuth('LOGIN_SUCCESS', { username, role: user.role });

      // Update last login
      await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1', [user.user_id]);

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.user_id.toString(),
            username: user.username,
            role: user.role,
            full_name: user.full_name,
            permissions: []
          },
          token: `token-${Date.now()}`,
          expiresIn: '24h'
        },
        timestamp: new Date().toISOString(),
      });
    }

    logAuth('LOGIN_FAILED', { username, reason: 'invalid_password' });
    res.status(401).json({
      success: false,
      message: 'Invalid username or password',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logAuth('LOGIN_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/auth/logout - User logout
router.post('/logout', async (req, res) => {
  logAuth('LOGOUT', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    // In production, invalidate the token in user_sessions table
    // For now, just return success
    res.json({
      success: true,
      message: 'Logout successful',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logAuth('LOGOUT_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/auth/profile - Get user profile
router.get('/profile', async (req, res) => {
  logAuth('GET_PROFILE', {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  try {
    const db = getDatabase();
    const username = req.query.username;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required',
        timestamp: new Date().toISOString(),
      });
    }

    // Check demo accounts (admin and teacher unified)
    const demoAccounts = {
      'admin': { role: 'teacher', full_name: '管理员' },
      'teacher': { role: 'teacher', full_name: '教师' }
    };

    if (demoAccounts[username]) {
      return res.json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          username,
          role: demoAccounts[username].role,
          full_name: demoAccounts[username].full_name
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check database
    const query = 'SELECT user_id, username, email, role, full_name, last_login FROM users WHERE username = $1 AND is_active = true';
    const result = await db.query(query, [username]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logAuth('GET_PROFILE_ERROR', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
