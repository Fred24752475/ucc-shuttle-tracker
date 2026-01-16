const fs = require('fs');
const path = require('path');

const htmlDir = './htmls';
const files = fs.readdirSync(htmlDir);

files.forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(htmlDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Replace all localhost:3001 URLs with relative paths
        content = content.replace(/http:\/\/localhost:3001\/api\//g, '/api/');
        content = content.replace(/http:\/\/localhost:3001/g, '');
        
        fs.writeFileSync(filePath, content);
        console.log(`Fixed: ${file}`);
    }
});

console.log('All HTML files updated!');