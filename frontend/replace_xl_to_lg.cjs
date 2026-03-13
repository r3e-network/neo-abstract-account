const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.join(__dirname, 'src');

walkDir(targetDir, function(filePath) {
  if (filePath.endsWith('.vue')) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('rounded-xl')) {
      const updatedContent = content.replace(/rounded-xl/g, 'rounded-lg');
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated: ${filePath}`);
    }
  }
});

console.log('Replacement complete.');
