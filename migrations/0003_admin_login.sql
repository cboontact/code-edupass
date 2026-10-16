CREATE TABLE admin_login_attempts (
  client_key TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
DELETE FROM settings WHERE key = 'requireEmailBinding';
