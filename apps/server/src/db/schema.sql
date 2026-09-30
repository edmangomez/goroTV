-- Proveedores IPTV Xtream Codes
CREATE TABLE IF NOT EXISTS providers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    host        TEXT NOT NULL,
    username    TEXT NOT NULL,
    password    TEXT NOT NULL,
    is_active   INTEGER DEFAULT 1,
    notes       TEXT,
    created_at  TEXT DEFAULT (datetime('now')),
    updated_at  TEXT DEFAULT (datetime('now'))
);

-- Clientes / Usuarios de goroTV
CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    provider_id     INTEGER NOT NULL,
    max_connections INTEGER DEFAULT 1,
    expires_at      TEXT NOT NULL,
    is_active       INTEGER DEFAULT 1,
    display_name    TEXT,
    phone           TEXT,
    notes           TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE RESTRICT
);

-- Sesiones activas (Control de pantallas simultáneas vía Heartbeat)
CREATE TABLE IF NOT EXISTS active_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    device_id   TEXT NOT NULL,
    device_name TEXT,
    ip_address  TEXT,
    last_ping   TEXT DEFAULT (datetime('now')),
    created_at  TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, device_id)
);

-- Administradores del panel
CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TEXT DEFAULT (datetime('now'))
);

-- Progreso de reproducción ('Continuar viendo' estilo Netflix)
CREATE TABLE IF NOT EXISTS user_playback_progress (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    content_type     TEXT NOT NULL CHECK(content_type IN ('movie', 'series')),
    stream_id        INTEGER NOT NULL,
    series_id        INTEGER,
    season_num       INTEGER,
    episode_num      INTEGER,
    episode_id       INTEGER,
    title            TEXT NOT NULL,
    subtitle         TEXT,
    poster_url       TEXT,
    progress_seconds REAL NOT NULL DEFAULT 0,
    duration_seconds REAL NOT NULL DEFAULT 0,
    completed        INTEGER NOT NULL DEFAULT 0,
    updated_at       TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, content_type, stream_id)
);

-- Índices de alto rendimiento
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_user_id ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_ping ON active_sessions(last_ping);
CREATE INDEX IF NOT EXISTS idx_playback_user_updated ON user_playback_progress(user_id, updated_at);
