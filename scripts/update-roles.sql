-- Update database to merge admin and teacher roles, remove student role
-- Run this to update existing users in the database

-- Update all admin users to teacher role
UPDATE users SET role = 'teacher' WHERE role = 'admin';

-- Remove student users or update them to teacher (uncomment as needed)
-- UPDATE users SET is_active = false WHERE role = 'student';
-- UPDATE users SET role = 'teacher' WHERE role = 'student';

-- Update role constraint to only allow 'teacher'
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('teacher'));

-- Verify the changes
SELECT user_id, username, email, role, is_active FROM users ORDER BY user_id;
