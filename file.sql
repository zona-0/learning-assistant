DROP DATABASE IF EXISTS cleverai_db;
CREATE DATABASE cleverai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cleverai_db;

CREATE TABLE users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name     VARCHAR(100),
    role          ENUM('admin','pelajar') NOT NULL DEFAULT 'pelajar',
    is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE profiles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    jurusan         VARCHAR(100),
    target_belajar  VARCHAR(255),
    milestone       TEXT,
    progress_persen FLOAT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE dashboard_stats (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL UNIQUE,
    total_sesi_pomodoro INT DEFAULT 0,
    total_notes         INT DEFAULT 0,
    total_deadline      INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO users (username, email, password_hash, full_name, role, is_verified)
VALUES ('admin', 'admin@cleverai.com', SHA2('admin123', 256), 'Administrator CleverAI', 'admin', TRUE);

INSERT INTO profiles (user_id) VALUES (1);
INSERT INTO dashboard_stats (user_id) VALUES (1);

SELECT id, username, full_name, role, is_verified FROM users;
