require('dotenv').config();
const pool = require('./database/postgres');

async function setupFriendTables() {
    const client = await pool.connect();
    
    try {
        console.log('🔧 Setting up friend system tables...');
        
        // Create friendships table
        await client.query(`
            CREATE TABLE IF NOT EXISTS friendships (
                id SERIAL PRIMARY KEY,
                requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(requester_id, receiver_id)
            )
        `);
        console.log('✅ Friendships table created');
        
        // Create conversations table
        await client.query(`
            CREATE TABLE IF NOT EXISTS conversations (
                id SERIAL PRIMARY KEY,
                participant1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                participant2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Conversations table created');
        
        // Create messages table
        await client.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Messages table created');
        
        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
            CREATE INDEX IF NOT EXISTS idx_friendships_receiver ON friendships(receiver_id);
            CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
            CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations(participant1_id, participant2_id);
            CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
            CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
        `);
        console.log('✅ Indexes created');
        
        console.log('🎉 Friend system tables setup complete!');
        
    } catch (error) {
        console.error('❌ Error setting up tables:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupFriendTables()
    .then(() => {
        console.log('✅ Setup completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
