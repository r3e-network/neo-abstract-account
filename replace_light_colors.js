const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend/src');

const replacements = {
  'bg-emerald-50': 'bg-ata-green/10',
  'bg-emerald-100': 'bg-ata-green/10',
  'bg-emerald-200': 'bg-ata-green/10',
  
  'border-emerald-200': 'border-ata-green/30',
  'border-emerald-500': 'border-ata-green/30',
  
  'text-emerald-600': 'text-ata-green',
  'text-emerald-700': 'text-ata-green',
  'text-emerald-800': 'text-ata-green',
  
  'bg-emerald-600': 'bg-ata-green text-ata-dark',
  'hover:bg-emerald-700': 'hover:opacity-80',
  
  'bg-amber-50': 'bg-amber-500/10',
  'bg-amber-100': 'bg-amber-500/10',
  
  'border-amber-200': 'border-amber-500/30',
  
  'text-amber-600': 'text-amber-400',
  'text-amber-700': 'text-amber-400',
  'text-amber-800': 'text-amber-400',
  
  'bg-rose-50': 'bg-rose-500/10',
  'bg-rose-100': 'bg-rose-500/10',
  
  'border-rose-200': 'border-rose-500/30',
  
  'text-rose-600': 'text-rose-400',
  'text-rose-700': 'text-rose-400',
  'text-rose-800': 'text-rose-400',
};

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (filePath.endsWith('.vue')) {
      processFile(filePath);
    }
  }
}

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Create a regex that matches any of the keys, but ensuring word boundaries
  // to prevent matching parts of other class names.
  for (const [key, value] of Object.entries(replacements)) {
      // Escape special characters in the key for regex, mainly the colon
      const escapedKey = key.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
      const regex = new RegExp(`\\b${escapedKey}\\b`, 'g');
      content = content.replace(regex, value);
  }
  
  if (content !== originalContent) {
    console.log(`Updated: ${filePath}`);
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

processDirectory(directoryPath);
console.log('Done!');
