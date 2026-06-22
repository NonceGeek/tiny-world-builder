CREATE TABLE IF NOT EXISTS collab_rooms (
  room_id TEXT PRIMARY KEY,
  share_id TEXT,
  name TEXT NOT NULL DEFAULT 'Shared build',
  host_name TEXT NOT NULL DEFAULT 'Builder',
  location TEXT NOT NULL DEFAULT '',
  party_host TEXT NOT NULL DEFAULT '',
  observer_count INTEGER NOT NULL DEFAULT 0,
  player_count INTEGER NOT NULL DEFAULT 0,
  editor_count INTEGER NOT NULL DEFAULT 0,
  network_quality TEXT NOT NULL DEFAULT 'unknown',
  rtt_ms INTEGER,
  owner_auth_id TEXT NOT NULL DEFAULT '',
  owner_profile_id BIGINT,
  href TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE collab_rooms ADD COLUMN IF NOT EXISTS owner_auth_id TEXT NOT NULL DEFAULT '';
ALTER TABLE collab_rooms ADD COLUMN IF NOT EXISTS owner_profile_id BIGINT;

CREATE INDEX IF NOT EXISTS collab_rooms_last_seen_idx ON collab_rooms (last_seen DESC);
CREATE INDEX IF NOT EXISTS collab_rooms_owner_profile_idx ON collab_rooms (owner_profile_id, last_seen DESC);
CREATE INDEX IF NOT EXISTS collab_rooms_owner_auth_idx ON collab_rooms (owner_auth_id, last_seen DESC);
