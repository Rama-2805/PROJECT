-- SmartCampus AI — Database Initialization
-- PostgreSQL setup with Row-Level Security for multi-tenant isolation

-- ─── Extensions ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Application User ──────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'smartcampus_app') THEN
    CREATE ROLE smartcampus_app WITH LOGIN PASSWORD 'app_password_here';
  END IF;
END
$$;

-- ─── Read-Only Role for Analytics ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'smartcampus_readonly') THEN
    CREATE ROLE smartcampus_readonly WITH LOGIN PASSWORD 'readonly_password_here';
  END IF;
END
$$;

-- ─── Grant Permissions ─────────────────────────────────────────
GRANT CONNECT ON DATABASE smartcampus TO smartcampus_app, smartcampus_readonly;
GRANT USAGE ON SCHEMA public TO smartcampus_app, smartcampus_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO smartcampus_readonly;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO smartcampus_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO smartcampus_app;

-- ─── Row-Level Security: Institution Isolation ─────────────────
-- Enable RLS on multi-tenant tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'institutionId' AND table_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('
      DROP POLICY IF EXISTS institution_isolation ON %I;
      CREATE POLICY institution_isolation ON %I
        FOR ALL
        USING (institutionId = current_setting(''app.current_institution_id'')::text);', tbl, tbl);
  END LOOP;
END
$$;

-- ─── Indexes for Performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON "AuditLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON "AuditLog"("userId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON "AuditLog"("entity", "entityId");

-- ─── Connection Pool Configuration ─────────────────────────────
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '2GB';
ALTER SYSTEM SET work_mem = '16MB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET wal_level = replica;
ALTER SYSTEM SET max_wal_senders = 3;
ALTER SYSTEM SET max_replication_slots = 3;

SELECT pg_reload_conf();
