const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', function(filePath) {
    if (filePath.endsWith('.vue')) {
        let content = fs.readFileSync(filePath, 'utf-8');
        let newContent = content.replace(/rounded-3xl/g, 'rounded-lg').replace(/rounded-2xl/g, 'rounded-lg');
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf-8');
            console.log(`Updated ${filePath}`);
        }
    }
});
console.log('Replacement complete.');