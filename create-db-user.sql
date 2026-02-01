-- UNIVERSAL DATABASE USER CREATION TEMPLATE
-- Replace placeholders with actual values:
--   {USERNAME}        - Database username
--   {PASSWORD}        - User password
--   {PRIVILEGE_LEVEL} - superuser, admin, standard, or readonly

-- ============================================
-- OPTION 1: SUPERUSER (Full privileges)
-- ============================================
CREATE USER "{USERNAME}" WITH PASSWORD '{PASSWORD}';
ALTER USER "{USERNAME}" WITH SUPERUSER;
ALTER USER "{USERNAME}" WITH CREATEDB;
ALTER USER "{USERNAME}" WITH CREATEROLE;
ALTER USER "{USERNAME}" WITH REPLICATION;

GRANT ALL PRIVILEGES ON DATABASE neuraplay TO "{USERNAME}";
\c neuraplay;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "{USERNAME}";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "{USERNAME}";
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "{USERNAME}";
GRANT USAGE ON SCHEMA public TO "{USERNAME}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "{USERNAME}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "{USERNAME}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO "{USERNAME}";

-- ============================================
-- OPTION 2: ADMIN (DB creation, no superuser)
-- ============================================
-- CREATE USER "{USERNAME}" WITH PASSWORD '{PASSWORD}';
-- ALTER USER "{USERNAME}" WITH NOSUPERUSER;
-- ALTER USER "{USERNAME}" WITH CREATEDB;
-- ALTER USER "{USERNAME}" WITH CREATEROLE;
-- 
-- GRANT ALL PRIVILEGES ON DATABASE neuraplay TO "{USERNAME}";
-- \c neuraplay;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "{USERNAME}";
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "{USERNAME}";
-- GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO "{USERNAME}";
-- GRANT USAGE ON SCHEMA public TO "{USERNAME}";
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "{USERNAME}";

-- ============================================
-- OPTION 3: STANDARD (Read/write, no DB creation)
-- ============================================
-- CREATE USER "{USERNAME}" WITH PASSWORD '{PASSWORD}';
-- ALTER USER "{USERNAME}" WITH NOSUPERUSER;
-- ALTER USER "{USERNAME}" WITH NOCREATEDB;
-- ALTER USER "{USERNAME}" WITH NOCREATEROLE;
-- 
-- GRANT CONNECT ON DATABASE neuraplay TO "{USERNAME}";
-- \c neuraplay;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "{USERNAME}";
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "{USERNAME}";
-- GRANT USAGE ON SCHEMA public TO "{USERNAME}";
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "{USERNAME}";

-- ============================================
-- OPTION 4: READONLY (Read-only access)
-- ============================================
-- CREATE USER "{USERNAME}" WITH PASSWORD '{PASSWORD}';
-- ALTER USER "{USERNAME}" WITH NOSUPERUSER;
-- ALTER USER "{USERNAME}" WITH NOCREATEDB;
-- ALTER USER "{USERNAME}" WITH NOCREATEROLE;
-- 
-- GRANT CONNECT ON DATABASE neuraplay TO "{USERNAME}";
-- \c neuraplay;
-- GRANT USAGE ON SCHEMA public TO "{USERNAME}";
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO "{USERNAME}";
-- GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO "{USERNAME}";
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO "{USERNAME}";

-- ============================================
-- EXAMPLE: Create AdminUncle superuser
-- ============================================
-- CREATE USER "AdminUncle" WITH PASSWORD 'AdminUncle';
-- ALTER USER "AdminUncle" WITH SUPERUSER;
-- ALTER USER "AdminUncle" WITH CREATEDB;
-- ALTER USER "AdminUncle" WITH CREATEROLE;
-- GRANT ALL PRIVILEGES ON DATABASE neuraplay TO "AdminUncle";

-- ============================================
-- VERIFY USER CREATION
-- ============================================
SELECT usename, usesuper, usecreatedb, usecreaterole 
FROM pg_user 
WHERE usename = '{USERNAME}';

\du "{USERNAME}"

