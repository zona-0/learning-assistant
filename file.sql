CREATE DATABASE cleverai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE cleverai_db;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, email, password_hash, full_name)
VALUES ('admin', 'admin@cleverai.com', 
        SHA2('admin123', 256), 
        'Administrator CleverAI');

SELECT * FROM users;