const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./ucc_shuttle_enhanced.db');

console.log('🔧 Fixing password_resets table...');

db.serialize(() => {
    // Drop old table
    db.run('DROP TABLE IF EXISTS password_resets', (err) => {
        if (err) {
            console.error('❌ Error dropping table:', err);
        } else {
            console.log('✅ Old table dropped');
        }
    });

    // Create new table with correct schema
    db.run(`CREATE TABLE password_resets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        reset_code TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
        if (err) {
            console.error('❌ Error creating table:', err);
        } else {
            console.log('✅ password_resets table created successfully!');
        }
        db.close();
    });
});
