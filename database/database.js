const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'shuttle_tracker.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Users table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('student', 'driver', 'admin', 'support')),
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
            phone TEXT,
            profile_image TEXT,
            mfa_enabled BOOLEAN DEFAULT 0,
            mfa_secret TEXT,
            last_login DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Shuttles table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS shuttles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id INTEGER,
            plate_number TEXT UNIQUE NOT NULL,
            capacity INTEGER DEFAULT 18,
            current_lat REAL,
            current_lng REAL,
            status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'maintenance')),
            last_location_update DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (driver_id) REFERENCES users (id)
          )
        `);

        // Trips table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            driver_id INTEGER,
            shuttle_id INTEGER,
            origin TEXT NOT NULL,
            destination TEXT NOT NULL,
            origin_lat REAL,
            origin_lng REAL,
            destination_lat REAL,
            destination_lng REAL,
            status TEXT DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'en_route', 'completed', 'cancelled')),
            fare DECIMAL(10, 2),
            payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
            rating INTEGER CHECK (rating >= 1 AND rating <= 5),
            feedback TEXT,
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            accepted_at DATETIME,
            completed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users (id),
            FOREIGN KEY (driver_id) REFERENCES users (id),
            FOREIGN KEY (shuttle_id) REFERENCES shuttles (id)
          )
        `);

        // Conversations table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK (type IN ('student_driver', 'student_support', 'driver_support', 'admin_monitor')),
            trip_id INTEGER,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trip_id) REFERENCES trips (id)
          )
        `);

        // Conversation participants table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS conversation_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id),
            UNIQUE(conversation_id, user_id)
          )
        `);

        // Messages table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'location', 'system')),
            file_url TEXT,
            delivered_at DATETIME,
            read_at DATETIME,
            archived BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users (id)
          )
        `);

        // Audit logs table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id INTEGER,
            ip_address TEXT,
            user_agent TEXT,
            details TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `);

        // Driver performance table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS driver_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id INTEGER NOT NULL,
            date DATE NOT NULL,
            trips_completed INTEGER DEFAULT 0,
            total_fare DECIMAL(10, 2) DEFAULT 0,
            average_rating DECIMAL(3, 2) DEFAULT 0,
            on_time_percentage DECIMAL(5, 2) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (driver_id) REFERENCES users (id),
            UNIQUE(driver_id, date)
          )
        `);

        // System settings table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT UNIQUE NOT NULL,
            value TEXT,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database tables created successfully');
            resolve();
          }
        });
      });
    });
  }

  getDB() {
    return this.db;
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error(err.message);
        }
        console.log('Database connection closed.');
        resolve();
      });
    });
  }
}

module.exports = new Database();