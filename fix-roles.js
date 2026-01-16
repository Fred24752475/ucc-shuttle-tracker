const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./ucc_shuttle_enhanced.db');

console.log('🔍 Checking user roles in database...\n');

db.all('SELECT id, name, email, role FROM users', [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }
    
    console.log('Current users:');
    rows.forEach(row => {
        console.log(`${row.id}. ${row.name} (${row.email}) - Role: ${row.role}`);
    });
    
    console.log('\n🔧 Fixing roles...\n');
    
    // Fix the roles
    db.run("UPDATE users SET role = 'student' WHERE email = 'student@ucc.edu.gh'", (err) => {
        if (err) console.error('Error updating student:', err);
        else console.log('✅ Fixed student@ucc.edu.gh -> role: student');
    });
    
    db.run("UPDATE users SET role = 'driver' WHERE email = 'driver@ucc.edu.gh'", (err) => {
        if (err) console.error('Error updating driver:', err);
        else console.log('✅ Fixed driver@ucc.edu.gh -> role: driver');
    });
    
    db.run("UPDATE users SET role = 'admin' WHERE email = 'admin@ucc.edu.gh'", (err) => {
        if (err) console.error('Error updating admin:', err);
        else console.log('✅ Fixed admin@ucc.edu.gh -> role: admin');
        
        // Verify after update
        setTimeout(() => {
            db.all('SELECT email, role FROM users WHERE email IN (?, ?, ?)', 
                ['student@ucc.edu.gh', 'driver@ucc.edu.gh', 'admin@ucc.edu.gh'], 
                (err, rows) => {
                    console.log('\n✅ Updated roles:');
                    rows.forEach(row => {
                        console.log(`${row.email} -> ${row.role}`);
                    });
                    db.close();
                });
        }, 500);
    });
});
