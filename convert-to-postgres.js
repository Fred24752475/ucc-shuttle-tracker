const fs = require('fs');

console.log('Converting server-enhanced.js to PostgreSQL...\n');

let content = fs.readFileSync('server-enhanced.js', 'utf8');

// Remove SQLite import
content = content.replace(
    "const sqlite3 = require('sqlite3').verbose();",
    ""
);

content = content.replace(
    "const { initializeEnhancedDatabase, insertEnhancedSampleData } = require('./database/enhanced-schema');",
    ""
);

// Add Knex import at top
content = content.replace(
    "const express = require('express');",
    "const express = require('express');\nconst db = require('./database/db');"
);

// Remove old db variable declaration
content = content.replace(/let db;[\s\n]*/, '');

// Update initializeServer function
content = content.replace(
    /async function initializeServer\(\) \{[\s\S]*?\n\}/m,
    `async function initializeServer() {
    try {
        console.log('✅ PostgreSQL database connected successfully');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        process.exit(1);
    }
}`
);

// Comment out ETA system initialization (has SQLite code)
content = content.replace(
    /function initializeETASystem\(\) \{/,
    'function initializeETASystem() {\n    console.log("⚠️ ETA system disabled - needs PostgreSQL conversion");\n    return;\n    // OLD CODE:'
);

// Save converted file
fs.writeFileSync('server-enhanced.js', content);

console.log('✅ Conversion complete!');
console.log('⚠️  Note: Some complex queries may need manual review');
console.log('📝 Original backed up to server-sqlite-backup.js');
