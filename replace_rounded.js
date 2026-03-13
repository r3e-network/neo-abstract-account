const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

const targetDir = path.resolve(__dirname, 'frontend/src');

walkDir(targetDir, function(filePath) {
  if (filePath.endsWith('.vue')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('rounded-md')) {
      let updatedContent = content.replace(/rounded-md/g, 'rounded');
      fs.writeFileSync(filePath, updatedContent, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});