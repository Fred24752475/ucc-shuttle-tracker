const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🔐 UCC Shuttle Tracker - Admin Account Creator');
console.log('==============================================\n');

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
    try {
        const name = await question('Admin Full Name: ');
        const email = await question('Admin Email: ');
        const phone = await question('Admin Phone (optional): ');
        const password = await question('Admin Password (min 6 chars): ');
        
        if (!name || !email || !password) {
            console.log('\n❌ Name, email, and password are required!');
            rl.close();
            return;
        }
        
        if (password.length < 6) {
            console.log('\n❌ Password must be at least 6 characters!');
            rl.close();
            return;
        }
        
        const db = new sqlite3.Database('./ucc_shuttle_enhanced.db');
        
        // Check if email exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                console.log('\n❌ Database error:', err.message);
                rl.close();
                return;
            }
            
            if (row) {
                console.log('\n❌ Email already exists!');
                rl.close();
                return;
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Insert admin
            db.run(
                'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
                [name, email, hashedPassword, phone || null, 'admin'],
                function(err) {
                    if (err) {
                        console.log('\n❌ Error creating admin:', err.message);
                    } else {
                        console.log('\n✅ Admin account created successfully!');
                        console.log(`\nAdmin ID: ${this.lastID}`);
                        console.log(`Name: ${name}`);
                        console.log(`Email: ${email}`);
                        console.log(`Role: admin`);
                        console.log('\n🔑 Login at: http://localhost:3001/htmls/admin-login.html');
                    }
                    db.close();
                    rl.close();
                }
            );
        });
        
    } catch (error) {
        console.log('\n❌ Error:', error.message);
        rl.close();
    }
}

createAdmin();
