PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS buckets (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  group_name  TEXT    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  deadline    TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  notes        TEXT,
  bucket_id    INTEGER NOT NULL REFERENCES buckets(id) ON DELETE RESTRICT,
  sub_area     TEXT,
  priority     TEXT    NOT NULL DEFAULT 'P2' CHECK(priority IN ('P0','P1','P2','P3')),
  effort       TEXT    NOT NULL DEFAULT 'Medium' CHECK(effort IN ('Quick','Medium','Deep')),
  status       TEXT    NOT NULL DEFAULT 'Todo' CHECK(status IN ('Todo','In Progress','Waiting On','Done')),
  waiting_on   TEXT,
  source       TEXT    NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','slack')),
  slack_ts     TEXT    UNIQUE,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_bucket   ON tasks(bucket_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
