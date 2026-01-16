const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

// Enhanced database initialization with all required tables
function initializeEnhancedDatabase() {
    const db = new sqlite3.Database('./ucc_shuttle_enhanced.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
    
    console.log('🔧 Initializing enhanced database schema...');

    const tables = [
        // Enhanced users table with additional fields
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            role TEXT NOT NULL CHECK(role IN ('student', 'driver', 'admin', 'support')),
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
            last_login DATETIME,
            MFA_enabled BOOLEAN DEFAULT 0,
            language_preference TEXT DEFAULT 'en',
            accessibility_mode BOOLEAN DEFAULT 0,
            profile_image_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Enhanced shuttles table with maintenance tracking
        `CREATE TABLE IF NOT EXISTS shuttles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            license_plate TEXT UNIQUE NOT NULL,
            capacity INTEGER NOT NULL,
            status TEXT DEFAULT 'available' CHECK(status IN ('available', 'in_use', 'maintenance', 'offline', 'cleaning')),
            current_location_lat REAL,
            current_location_lng REAL,
            driver_id INTEGER,
            last_maintenance DATETIME,
            next_maintenance_due DATETIME,
            mileage INTEGER DEFAULT 0,
            fuel_level REAL DEFAULT 100,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (driver_id) REFERENCES users(id)
        )`,

        // Enhanced trips table with more tracking
        `CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            driver_id INTEGER,
            shuttle_id INTEGER,
            pickup_location TEXT NOT NULL,
            destination TEXT NOT NULL,
            pickup_lat REAL,
            pickup_lng REAL,
            destination_lat REAL,
            destination_lng REAL,
            status TEXT DEFAULT 'requested' CHECK(status IN ('requested', 'accepted', 'en_route', 'in_progress', 'completed', 'cancelled', 'no_show')),
            fare_amount REAL,
            payment_status TEXT DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'refunded')),
            rating INTEGER CHECK(rating BETWEEN 1 AND 5),
            feedback TEXT,
            requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            accepted_at DATETIME,
            started_at DATETIME,
            completed_at DATETIME,
            estimated_duration INTEGER,
            actual_duration INTEGER,
            distance_km REAL,
            FOREIGN KEY (student_id) REFERENCES users(id),
            FOREIGN KEY (driver_id) REFERENCES users(id),
            FOREIGN KEY (shuttle_id) REFERENCES shuttles(id)
        )`,

        // Enhanced conversations table for messaging
        `CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('student_driver', 'student_support', 'driver_support', 'admin_monitor')),
            subject TEXT,
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'archived')),
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
            ai_assigned BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Conversation participants table
        `CREATE TABLE IF NOT EXISTS conversation_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_read_at DATETIME,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(conversation_id, user_id)
        )`,

        // Enhanced messages table with delivery tracking
        `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'location', 'file', 'system')),
            translated_content TEXT,
            original_language TEXT,
            delivered BOOLEAN DEFAULT 0,
            read BOOLEAN DEFAULT 0,
            delivered_at DATETIME,
            read_at DATETIME,
            archived BOOLEAN DEFAULT 0,
            ai_generated BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id)
        )`,

        // Comprehensive audit logs table
        `CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id INTEGER,
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            device_info TEXT,
            location_lat REAL,
            location_lng REAL,
            success BOOLEAN DEFAULT 1,
            error_message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // Driver assignments with scheduling
        `CREATE TABLE IF NOT EXISTS driver_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id INTEGER NOT NULL,
            shuttle_id INTEGER NOT NULL,
            shift_start DATETIME NOT NULL,
            shift_end DATETIME NOT NULL,
            status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'active', 'completed', 'cancelled')),
            route TEXT,
            performance_score REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (driver_id) REFERENCES users(id),
            FOREIGN KEY (shuttle_id) REFERENCES shuttles(id)
        )`,

        // AI analytics and predictions
        `CREATE TABLE IF NOT EXISTS ai_predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prediction_type TEXT NOT NULL CHECK(prediction_type IN ('demand_forecast', 'route_optimization', 'maintenance', 'anomaly', 'performance')),
            reference_id INTEGER,
            prediction_data TEXT NOT NULL,
            confidence_score REAL,
            actual_outcome TEXT,
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'false_positive')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME
        )`,

        // User rewards and gamification
        `CREATE TABLE IF NOT EXISTS user_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reward_type TEXT NOT NULL CHECK(reward_type IN ('points', 'badge', 'achievement', 'milestone')),
            points_earned INTEGER DEFAULT 0,
            points_spent INTEGER DEFAULT 0,
            description TEXT,
            reference_trip_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (reference_trip_id) REFERENCES trips(id)
        )`,

        // Notification settings and history
        `CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info' CHECK(type IN ('info', 'success', 'warning', 'error', 'trip_update', 'promotional')),
            channel TEXT DEFAULT 'in_app' CHECK(channel IN ('in_app', 'email', 'sms', 'push')),
            read BOOLEAN DEFAULT 0,
            read_at DATETIME,
            action_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // Password resets
        `CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            reset_code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            used INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`,

        // Emergency alerts (existing but enhanced)
        `CREATE TABLE IF NOT EXISTS emergency_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
            location_lat REAL,
            location_lng REAL,
            alert_type TEXT DEFAULT 'general' CHECK(alert_type IN ('general', 'medical', 'accident', 'security', 'breakdown')),
            status TEXT DEFAULT 'active' CHECK(status IN ('active', 'responding', 'resolved')),
            response_team_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (response_team_id) REFERENCES users(id)
        )`,

        // System configuration
        `CREATE TABLE IF NOT EXISTS system_config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            config_key TEXT UNIQUE NOT NULL,
            config_value TEXT NOT NULL,
            description TEXT,
            category TEXT DEFAULT 'general',
            updated_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (updated_by) REFERENCES users(id)
        )`,

        // Route optimization data
        `CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            start_point_lat REAL NOT NULL,
            start_point_lng REAL NOT NULL,
            end_point_lat REAL NOT NULL,
            end_point_lng REAL NOT NULL,
            waypoints TEXT,
            estimated_time INTEGER,
            distance_km REAL,
            traffic_factor REAL DEFAULT 1.0,
            popularity_score INTEGER DEFAULT 0,
            active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Driver performance analytics
        `CREATE TABLE IF NOT EXISTS driver_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            driver_id INTEGER NOT NULL,
            date DATE NOT NULL,
            trips_completed INTEGER DEFAULT 0,
            average_rating REAL DEFAULT 0,
            total_earnings REAL DEFAULT 0,
            fuel_efficiency REAL,
            on_time_percentage REAL DEFAULT 100,
            customer_complaints INTEGER DEFAULT 0,
            ai_insights TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (driver_id) REFERENCES users(id),
            UNIQUE(driver_id, date)
        )`
    ];

    // Create indexes for performance
    const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
        'CREATE INDEX IF NOT EXISTS idx_trips_student_id ON trips(student_id)',
        'CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id)',
        'CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status)',
        'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)',
        'CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)',
        'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver ON driver_assignments(driver_id)',
        'CREATE INDEX IF NOT EXISTS idx_shuttles_driver ON shuttles(driver_id)',
        'CREATE INDEX IF NOT EXISTS idx_ai_predictions_type ON ai_predictions(prediction_type)'
    ];

    return new Promise((resolve, reject) => {
        let completed = 0;
        let total = tables.length;

        // Create tables first
        tables.forEach((sql, index) => {
            db.run(sql, (err) => {
                if (err) {
                    console.error(`❌ Error creating table ${index + 1}:`, err);
                    reject(err);
                } else {
                    console.log(`✅ Table ${index + 1} created successfully`);
                    completed++;
                    if (completed === total) {
                        // After all tables are created, create indexes
                        createIndexes();
                    }
                }
            });
        });

        function createIndexes() {
            let indexCompleted = 0;
            let indexTotal = indexes.length;

            if (indexTotal === 0) {
                // No indexes to create
                insertDefaultSystemConfig(db).then(() => {
                    console.log('🎉 Enhanced database initialization completed');
                    resolve(db);
                }).catch(reject);
                return;
            }

            indexes.forEach((sql, index) => {
                db.run(sql, (err) => {
                    if (err) {
                        console.error(`❌ Error creating index ${index + 1}:`, err);
                    } else {
                        console.log(`✅ Index ${index + 1} created successfully`);
                    }
                    indexCompleted++;
                    if (indexCompleted === indexTotal) {
                        insertDefaultSystemConfig(db).then(() => {
                            console.log('🎉 Enhanced database initialization completed');
                            resolve(db);
                        }).catch(reject);
                    }
                });
            });
        }
    });
}

function insertDefaultSystemConfig(db) {
    const configs = [
        ['system_name', 'UCC Shuttle Tracker', 'System display name', 'general'],
        ['default_language', 'en', 'Default language for new users', 'localization'],
        ['supported_languages', '["en", "fr", "tw", "ha", "yo"]', 'Supported languages array', 'localization'],
        ['max_trip_distance', '50', 'Maximum trip distance in km', 'operations'],
        ['base_fare', '5.0', 'Base fare in GHS', 'pricing'],
        ['fare_per_km', '2.5', 'Fare per kilometer in GHS', 'pricing'],
        ['ai_assistant_enabled', 'true', 'Enable AI chat assistant', 'features'],
        ['geofencing_enabled', 'true', 'Enable geofencing alerts', 'security'],
        ['maintenance_interval_days', '30', 'Days between maintenance checks', 'maintenance'],
        ['driver_rating_threshold', '3.5', 'Minimum rating for driver retention', 'quality'],
        ['max_message_length', '1000', 'Maximum message length in characters', 'messaging'],
        ['session_timeout_minutes', '60', 'Session timeout in minutes', 'security'],
        ['rate_limit_per_minute', '30', 'API requests per minute per user', 'security'],
        ['emergency_response_time', '5', 'Emergency response time in minutes', 'safety'],
        ['reward_points_per_trip', '10', 'Reward points earned per trip', 'gamification'],
        ['notification_retention_days', '30', 'Days to keep notifications', 'maintenance']
    ];

    return new Promise((resolve, reject) => {
        let completed = 0;
        configs.forEach(([key, value, desc, category]) => {
            db.run(`INSERT OR IGNORE INTO system_config (config_key, config_value, description, category) VALUES (?, ?, ?, ?)`,
                [key, value, desc, category], (err) => {
                    completed++;
                    if (err) {
                        console.error(`❌ Error inserting config ${key}:`, err);
                    } else {
                        console.log(`✅ Config ${key} inserted`);
                    }
                    if (completed === configs.length) {
                        resolve();
                    }
                });
        });
    });
}

// Enhanced sample data insertion
function insertEnhancedSampleData(db) {
    console.log('📊 Inserting enhanced sample data...');
    
    const sampleUsers = [
        ['Admin User', 'admin@ucc.edu.gh', 'admin123', '+233123456789', 'admin', 'en', 1, true],
        ['Support Agent', 'support@ucc.edu.gh', 'support123', '+233123456788', 'support', 'en', 0, true],
        ['John Driver', 'driver@ucc.edu.gh', 'driver123', '+233987654321', 'driver', 'en', 0, true],
        ['Kofi Driver', 'kofi@ucc.edu.gh', 'driver123', '+233987654322', 'driver', 'tw', 0, true],
        ['Jane Student', 'student@ucc.edu.gh', 'student123', '+233555666777', 'student', 'en', 0, false],
        ['Ama Student', 'ama@ucc.edu.gh', 'student123', '+233555666778', 'student', 'tw', 0, false],
        ['Yussif Student', 'yussif@ucc.edu.gh', 'student123', '+233555666779', 'student', 'ha', 0, false]
    ];

    return new Promise((resolve, reject) => {
        let completed = 0;
        sampleUsers.forEach(async ([name, email, password, phone, role, lang, mfa, mfaEnabled], index) => {
            try {
                const hashedPassword = await bcrypt.hash(password, 10);
                db.run(`INSERT OR IGNORE INTO users (name, email, password, phone, role, language_preference, MFA_enabled) 
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [name, email, hashedPassword, phone, role, lang, mfaEnabled], (err) => {
                        completed++;
                        if (err) {
                            console.error(`❌ Error inserting user ${name}:`, err);
                        } else {
                            console.log(`✅ User ${name} inserted`);
                        }
                        if (completed === sampleUsers.length) {
                            // Insert sample shuttles
                            insertSampleShuttles(db).then(resolve).catch(reject);
                        }
                    });
            } catch (error) {
                console.error(`❌ Password hashing error for ${name}:`, error);
                completed++;
                if (completed === sampleUsers.length) {
                    insertSampleShuttles(db).then(resolve).catch(reject);
                }
            }
        });
    });
}

function insertSampleShuttles(db) {
    const shuttles = [
        ['Campus Express 1', 'GT-1234', 16, 'available'],
        ['Campus Express 2', 'GT-5678', 18, 'available'],
        ['Library Shuttle', 'GT-9012', 14, 'maintenance'],
        ['Science Bus', 'GT-3456', 20, 'available']
    ];

    return new Promise((resolve, reject) => {
        let completed = 0;
        shuttles.forEach(([name, plate, capacity, status], index) => {
            db.run(`INSERT OR IGNORE INTO shuttles (name, license_plate, capacity, status) 
                    VALUES (?, ?, ?, ?)`,
                [name, plate, capacity, status], (err) => {
                    completed++;
                    if (err) {
                        console.error(`❌ Error inserting shuttle ${name}:`, err);
                    } else {
                        console.log(`✅ Shuttle ${name} inserted`);
                    }
                    if (completed === shuttles.length) {
                        // Insert sample routes
                        insertSampleRoutes(db).then(resolve).catch(reject);
                    }
                });
        });
    });
}

function insertSampleRoutes(db) {
    const routes = [
        ['Main Campus to Library', 5.1043, -1.2833, 5.1060, -1.2805, 15, 2.1],
        ['Science Block to Hostel', 5.1020, -1.2850, 5.1080, -1.2780, 20, 3.2],
        ['Main Gate to Admin Block', 5.1000, -1.2900, 5.1030, -1.2820, 10, 1.8],
        ['Library to Science Complex', 5.1060, -1.2805, 5.1045, -1.2840, 12, 1.5]
    ];

    return new Promise((resolve, reject) => {
        let completed = 0;
        routes.forEach(([name, lat1, lng1, lat2, lng2, time, distance], index) => {
            db.run(`INSERT OR IGNORE INTO routes (name, start_point_lat, start_point_lng, end_point_lat, end_point_lng, estimated_time, distance_km) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [name, lat1, lng1, lat2, lng2, time, distance], (err) => {
                    completed++;
                    if (err) {
                        console.error(`❌ Error inserting route ${name}:`, err);
                    } else {
                        console.log(`✅ Route ${name} inserted`);
                    }
                    if (completed === routes.length) {
                        console.log('🎉 Sample data insertion completed');
                        resolve();
                    }
                });
        });
    });
}

module.exports = {
    initializeEnhancedDatabase,
    insertEnhancedSampleData
};