-- Run once against database student_management (or your PGDATABASE), e.g.:
--   psql -U postgres -p 5433 -d student_management -f schema.sql

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  course VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 1 AND age <= 120)
);

CREATE INDEX IF NOT EXISTS idx_students_email ON students (email);
