-- UCC Shuttle Tracker Database Setup for Supabase

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'driver', 'admin', 'support')),
    status VARCHAR(20) DEFAULT 'active',
    student_id VARCHAR(50),
    license_number VARCHAR(50),
    is_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shuttles table
CREATE TABLE shuttles (
    id SERIAL PRIMARY KEY,
    driver_id INTEGER REFERENCES users(id),
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    model VARCHAR(100),
    capacity INTEGER DEFAULT 14,
    status VARCHAR(20) DEFAULT 'inactive',
    current_latitude DECIMAL(10, 8),
    current_longitude DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trips table
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id),
    driver_id INTEGER REFERENCES users(id),
    shuttle_id INTEGER REFERENCES shuttles(id),
    pickup_location TEXT NOT NULL,
    destination TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    fare DECIMAL(10, 2) DEFAULT 10.00,
    rating INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    participant1_id INTEGER NOT NULL REFERENCES users(id),
    participant2_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id),
    sender_id INTEGER NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password resets table
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    reset_code VARCHAR(10) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default users
INSERT INTO users (name, email, password, phone, role, is_verified) VALUES
('Admin User', 'admin@ucc.edu.gh', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+233123456789', 'admin', true),
('Support Team', 'support@ucc.edu.gh', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+233123456790', 'support', true),
('Kofi Driver', 'kofi.driver@ucc.edu.gh', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+233123456791', 'driver', true),
('Kwame Student', 'kwame.student@ucc.edu.gh', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '+233123456793', 'student', true);

-- Insert default shuttle
INSERT INTO shuttles (driver_id, vehicle_number, model, capacity, status) VALUES
(3, 'UCC-001', 'Toyota Hiace', 14, 'active');