-- WordPress site connections for article export (Application Passwords auth)
CREATE TABLE IF NOT EXISTS wordpress_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  site_url TEXT NOT NULL,
  username TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  site_name TEXT,
  site_home TEXT,
  wp_version TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wp_conn_user ON wordpress_connections(user_id);
