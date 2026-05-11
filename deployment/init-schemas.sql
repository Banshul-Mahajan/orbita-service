-- ORBITA Platform — PostgreSQL Schema Initialization
-- Run once when the database is first created.
-- docker-compose.platform.yml mounts this as an init script.

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS discover;
CREATE SCHEMA IF NOT EXISTS knowledge;
CREATE SCHEMA IF NOT EXISTS create_orbit;
CREATE SCHEMA IF NOT EXISTS optimize;
CREATE SCHEMA IF NOT EXISTS visibility;
CREATE SCHEMA IF NOT EXISTS events;

-- Enable citext extension for case-insensitive email comparisons
CREATE EXTENSION IF NOT EXISTS citext;

-- Enable uuid-ossp for uuid_generate_v4() if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
