-- Add plugin tracking fields to wordpress_connections
ALTER TABLE wordpress_connections ADD COLUMN plugin_status TEXT DEFAULT 'not_checked';
ALTER TABLE wordpress_connections ADD COLUMN install_method TEXT;
ALTER TABLE wordpress_connections ADD COLUMN plugin_version TEXT;
