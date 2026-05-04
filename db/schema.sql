-- ResumeBuilder database schema
-- Applied once on first boot via lib/db.js initDb()
-- Single-user local app — no auth tables needed

-- ============================================================
-- Singleton contact table (always exactly one row, id = 1)
-- ============================================================

CREATE TABLE IF NOT EXISTS contact (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  full_name   TEXT    NOT NULL DEFAULT '',
  email       TEXT    NOT NULL DEFAULT '',
  phone       TEXT    NOT NULL DEFAULT '',
  location    TEXT    NOT NULL DEFAULT '',
  -- links_json stores a JSON array of {label, url} objects
  links_json  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(links_json)),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
-- Pre-seed the one and only contact row on first boot.
-- INSERT OR IGNORE means: if id=1 already exists (e.g. schema re-run), do nothing.
-- Routes always UPDATE this row rather than INSERT, so it must exist before any request arrives.
INSERT OR IGNORE INTO contact (id) VALUES (1);

-- ============================================================
-- Summary library (non-singleton — store as many variants as needed)
-- ============================================================

-- Users write multiple summary variants (e.g. "SWE", "Data Science") and
-- select one per resume via resume_items, same pattern as jobs/projects.
CREATE TABLE IF NOT EXISTS summaries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT    NOT NULL DEFAULT '',
  content     TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- Profile library tables (user builds these up over time)
-- ============================================================

CREATE TABLE IF NOT EXISTS educations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  institution TEXT    NOT NULL,
  degree      TEXT    NOT NULL DEFAULT '',
  field       TEXT    NOT NULL DEFAULT '',
  start_date  TEXT    NOT NULL DEFAULT '',
  end_date    TEXT    NOT NULL DEFAULT '',
  gpa         TEXT    NOT NULL DEFAULT '',
  details     TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jobs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  company     TEXT    NOT NULL,
  title       TEXT    NOT NULL DEFAULT '',
  location    TEXT    NOT NULL DEFAULT '',
  start_date  TEXT    NOT NULL DEFAULT '',
  end_date    TEXT    NOT NULL DEFAULT '',
  -- is_current: 1 = present position; end_date replaced with "Present" when 1
  is_current  INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_jobs_sort ON jobs(sort_order);

CREATE TABLE IF NOT EXISTS job_bullets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_job_bullets_job ON job_bullets(job_id);

CREATE TABLE IF NOT EXISTS projects (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  link        TEXT    NOT NULL DEFAULT '',
  description TEXT    NOT NULL DEFAULT '',
  start_date  TEXT    NOT NULL DEFAULT '',
  end_date    TEXT    NOT NULL DEFAULT '',
  -- is_current: 1 = present position; end_date replaced with "Present" when 1
  is_current  INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_projects_sort ON projects(sort_order);

CREATE TABLE IF NOT EXISTS project_bullets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  text        TEXT    NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_project_bullets_project ON project_bullets(project_id);

CREATE TABLE IF NOT EXISTS skill_categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skills (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  -- category_id nullable — skills can exist without a category
  category_id INTEGER REFERENCES skill_categories(id) ON DELETE SET NULL,
  name        TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category_id);

CREATE TABLE IF NOT EXISTS certifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  issuer       TEXT    NOT NULL DEFAULT '',
  issued_date  TEXT    NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS awards (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  issuer       TEXT    NOT NULL DEFAULT '',
  issued_date  TEXT    NOT NULL DEFAULT '',
  description  TEXT    NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- Resume builder tables
-- Resumes are LIVE selections — edits to library rows affect all resumes
-- that include them. This is intentional: fix a typo once, all resumes update.
-- ============================================================

CREATE TABLE IF NOT EXISTS resumes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  target_role TEXT    NOT NULL DEFAULT '',
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Which sections are toggled on/off and in what order for a given resume.
-- section_type is constrained to the known set of section names.
CREATE TABLE IF NOT EXISTS resume_sections (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_id    INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  section_type TEXT    NOT NULL CHECK (section_type IN (
                  'contact','summary','education','jobs',
                  'projects','skills','certifications','awards'
               )),
  included     INTEGER NOT NULL DEFAULT 1 CHECK (included IN (0, 1)),
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (resume_id, section_type)
);
CREATE INDEX IF NOT EXISTS idx_resume_sections_resume ON resume_sections(resume_id);

-- Which top-level library items are selected for a resume.
-- item_id points to the relevant library table row (e.g. jobs.id, educations.id).
-- Route code must validate that item_id exists in the correct table for section_type —
-- SQLite cannot enforce this polymorphic FK directly.
CREATE TABLE IF NOT EXISTS resume_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_id    INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  section_type TEXT    NOT NULL CHECK (section_type IN (
                  'summary','education','jobs',
                  'projects','skills','certifications','awards'
               )),
  item_id      INTEGER NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (resume_id, section_type, item_id)
);
CREATE INDEX IF NOT EXISTS idx_resume_items_resume ON resume_items(resume_id);

-- Which individual bullets within a selected item are included.
-- bullet_type disambiguates whether bullet_id refers to job_bullets or project_bullets —
-- avoids the ambiguity of bullet_id=1 existing in both tables.
CREATE TABLE IF NOT EXISTS resume_bullets (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  resume_id      INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  -- parent_item_id is the jobs.id or projects.id the bullet belongs to
  parent_item_id INTEGER NOT NULL,
  bullet_type    TEXT    NOT NULL CHECK (bullet_type IN ('job', 'project')),
  bullet_id      INTEGER NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (resume_id, parent_item_id, bullet_type, bullet_id)
);
CREATE INDEX IF NOT EXISTS idx_resume_bullets_resume ON resume_bullets(resume_id);

-- ============================================================
-- Settings singleton table (always exactly one row, id = 1)
-- Stores user-configurable app settings, including optional Gemini API key.
-- The key is stored as plain text (local-only app, no multi-user auth).
-- Routes read this before falling back to the .env GEMINI_API_KEY.
-- ============================================================

CREATE TABLE IF NOT EXISTS settings (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  gemini_api_key  TEXT    NOT NULL DEFAULT '',
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO settings (id) VALUES (1);

-- ============================================================
-- Triggers: keep updated_at current on every UPDATE
-- ============================================================

CREATE TRIGGER IF NOT EXISTS trg_contact_updated
  AFTER UPDATE ON contact
  BEGIN
    UPDATE contact SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trg_summaries_updated
  AFTER UPDATE ON summaries
  BEGIN
    UPDATE summaries SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trg_resumes_updated
  AFTER UPDATE ON resumes
  BEGIN
    UPDATE resumes SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

CREATE TRIGGER IF NOT EXISTS trg_settings_updated
  AFTER UPDATE ON settings
  BEGIN
    UPDATE settings SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
