CREATE TABLE IF NOT EXISTS collab_room_hides (
  room_id TEXT PRIMARY KEY,
  hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hidden_by TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS collab_room_hides_hidden_at_idx
  ON collab_room_hides (hidden_at DESC);
