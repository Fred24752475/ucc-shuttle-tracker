// UCC Shuttle Tracker - Enhanced Chat System Migration
// SQLite-compatible database migration for real-time messaging

const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./ucc_shuttle_new.db', (err) => {
    if (err) {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    } else {
        console.log('✅ Connected to SQLite database');
        createMessagingTables();
    }
});

function createMessagingTables() {
    console.log('🔨 Creating enhanced messaging tables...');

    const tables = [
        // Update users table to include messaging fields (handle gracefully)
        `ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'offline'`,
        `ALTER TABLE users ADD COLUMN last_seen DATETIME`,
        `ALTER TABLE users ADD COLUMN profile_image TEXT`,
        `ALTER TABLE users ADD COLUMN shuttle_id TEXT`,
        `ALTER TABLE users ADD COLUMN route_name TEXT`,

        // Enhanced conversations table
        `CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('student_driver', 'student_support', 'driver_support')),
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Enhanced conversation participants table
        `CREATE TABLE IF NOT EXISTS conversation_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            left_at DATETIME,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(conversation_id, user_id)
        )`,

        // Enhanced messages table
        `CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text' CHECK(message_type IN ('text', 'image', 'file', 'system')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            delivered_at DATETIME,
            read_at DATETIME,
            edited_at DATETIME,
            deleted_at DATETIME,
            reply_to_id INTEGER,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
        )`,

        // Enhanced presence table
        `CREATE TABLE IF NOT EXISTS presence (
            user_id INTEGER PRIMARY KEY,
            socket_id TEXT,
            is_online INTEGER DEFAULT 0,
            last_ping DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_agent TEXT,
            ip_address TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // Typing indicators table
        `CREATE TABLE IF NOT EXISTS typing_indicators (
            user_id INTEGER NOT NULL,
            conversation_id INTEGER NOT NULL,
            is_typing INTEGER DEFAULT 0,
            last_typing_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, conversation_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )`,

        // Message attachments table
        `CREATE TABLE IF NOT EXISTS message_attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            mime_type TEXT NOT NULL,
            file_path TEXT NOT NULL,
            thumbnail_path TEXT,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        )`,

        // Support tickets table
        `CREATE TABLE IF NOT EXISTS support_tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            student_id INTEGER NOT NULL,
            subject TEXT NOT NULL,
            category TEXT DEFAULT 'general' CHECK(category IN ('general', 'emergency', 'complaint', 'suggestion')),
            priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
            status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
            assigned_support_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_support_id) REFERENCES users(id) ON DELETE SET NULL
        )`,

        // User ratings table
        `CREATE TABLE IF NOT EXISTS user_ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rater_id INTEGER NOT NULL,
            rated_user_id INTEGER NOT NULL,
            conversation_id INTEGER NOT NULL,
            rating REAL NOT NULL CHECK(rating >= 1.0 AND rating <= 5.0),
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (rated_user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            UNIQUE(rater_id, rated_user_id, conversation_id)
        )`,

        // Chat metrics table
        `CREATE TABLE IF NOT EXISTS chat_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            conversation_id INTEGER NOT NULL,
            metric_type TEXT NOT NULL CHECK(metric_type IN ('response_time', 'message_count', 'session_duration', 'engagement')),
            metric_value REAL NOT NULL,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )`
    ];

    const indexes = [
        // Users table indexes
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
        'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
        'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
        'CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen)',
        
        // Conversations table indexes
        'CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type)',
        'CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at)',
        
        // Conversation participants indexes
        'CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON conversation_participants(conversation_id)',
        'CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_conversation_participants_active ON conversation_participants(is_active)',
        
        // Messages table indexes
        'CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC)',
        'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_delivery ON messages(delivered_at, read_at)',
        
        // Presence table indexes
        'CREATE INDEX IF NOT EXISTS idx_presence_socket ON presence(socket_id)',
        'CREATE INDEX IF NOT EXISTS idx_presence_online ON presence(is_online)',
        'CREATE INDEX IF NOT EXISTS idx_presence_last_ping ON presence(last_ping)',
        
        // Typing indicators indexes
        'CREATE INDEX IF NOT EXISTS idx_typing_conversation ON typing_indicators(conversation_id, last_typing_at)',
        
        // Message attachments indexes
        'CREATE INDEX IF NOT EXISTS idx_attachments_message ON message_attachments(message_id)',
        
        // Support tickets indexes
        'CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets(status, priority)',
        'CREATE INDEX IF NOT EXISTS idx_support_student ON support_tickets(student_id)',
        'CREATE INDEX IF NOT EXISTS idx_support_assigned ON support_tickets(assigned_support_id)',
        
        // User ratings indexes
        'CREATE INDEX IF NOT EXISTS idx_ratings_rated ON user_ratings(rated_user_id, rating)',
        
        // Chat metrics indexes
        'CREATE INDEX IF NOT EXISTS idx_metrics_user ON chat_metrics(user_id, metric_type, recorded_at)',
        'CREATE INDEX IF NOT EXISTS idx_metrics_conversation ON chat_metrics(conversation_id, metric_type)'
    ];

    const triggers = [
        // Update conversation timestamp when new message is inserted
        `CREATE TRIGGER IF NOT EXISTS update_conversation_timestamp 
        AFTER INSERT ON messages
        FOR EACH ROW
        BEGIN
            UPDATE conversations 
            SET updated_at = NEW.created_at 
            WHERE id = NEW.conversation_id;
        END`,
        
        // Clean up old typing indicators
        `CREATE TRIGGER IF NOT EXISTS cleanup_old_typing_indicators
        AFTER INSERT ON typing_indicators
        FOR EACH ROW
        BEGIN
            DELETE FROM typing_indicators 
            WHERE last_typing_at < datetime('now', '-5 minutes');
        END`
    ];

    let completedTables = 0;
    let completedIndexes = 0;
    let completedTriggers = 0;

    // Create tables (handle ALTER TABLE errors gracefully)
    tables.forEach((sql, index) => {
        db.run(sql, (err) => {
            if (err && !err.message.includes('duplicate column name') && !err.message.includes('already exists')) {
                console.error(`❌ Error creating table ${index + 1}:`, err.message);
            } else {
                console.log(`✅ Table ${index + 1} created successfully`);
            }
            completedTables++;
            
            if (completedTables === tables.length) {
                console.log('\n🔨 Creating indexes...');
                createIndexes();
            }
        });
    });

    function createIndexes() {
        if (indexes.length === 0) {
            console.log('✅ All indexes created successfully!');
            createTriggers();
            return;
        }

        indexes.forEach((sql, index) => {
            db.run(sql, (err) => {
                if (err) {
                    console.error(`❌ Error creating index ${index + 1}:`, err.message);
                } else {
                    console.log(`✅ Index ${index + 1} created successfully`);
                }
                completedIndexes++;
                
                if (completedIndexes === indexes.length) {
                    console.log('✅ All indexes created successfully!');
                    createTriggers();
                }
            });
        });
    }

    function createTriggers() {
        if (triggers.length === 0) {
            console.log('✅ All triggers created successfully!');
            finalizeDatabase();
            return;
        }

        triggers.forEach((sql, index) => {
            db.run(sql, (err) => {
                if (err) {
                    console.error(`❌ Error creating trigger ${index + 1}:`, err.message);
                } else {
                    console.log(`✅ Trigger ${index + 1} created successfully`);
                }
                completedTriggers++;
                
                if (completedTriggers === triggers.length) {
                    console.log('✅ All triggers created successfully!');
                    finalizeDatabase();
                }
            });
        });
    }

    function finalizeDatabase() {
        // Insert default presence for all existing users
        db.run(`INSERT OR IGNORE INTO presence (user_id, is_online) 
                SELECT id, 0 FROM users`, (err) => {
            if (err) {
                console.error('❌ Error initializing presence:', err.message);
            } else {
                console.log('✅ Presence initialized for existing users');
            }
            
            // Insert sample support user if not exists
            db.run(`INSERT OR IGNORE INTO users (name, email, password, phone, role, status) 
                    VALUES (?, ?, ?, ?, ?, ?)`,
                ['Support Agent', 'support@ucc.edu.gh', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '+233111222333', 'support', 'active'],
                (err) => {
                    if (err) {
                        console.error('❌ Error inserting sample support user:', err.message);
                    } else {
                        console.log('✅ Sample support user created');
                    }
                    
                    console.log('\n🎉 Enhanced database migration completed!');
                    console.log('📊 Database is now ready for advanced real-time messaging');
                    db.close((err) => {
                        if (err) {
                            console.error('❌ Error closing database:', err.message);
                        } else {
                            console.log('✅ Database connection closed');
                        }
                    });
                }
            );
        });
    }
}