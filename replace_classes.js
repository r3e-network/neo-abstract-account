const fs = require('fs');
const path = require('path');

const directory = path.join(__dirname, 'frontend/src/features/studio/components/');

const replacements = [
  { regex: /bg-green-500/g, replacement: 'bg-ata-green' },
  { regex: /text-green-700/g, replacement: 'text-ata-green' },
  { regex: /from-slate-800\/50/g, replacement: 'from-ata-dark/50' },
  { regex: /to-slate-900\/50/g, replacement: 'to-ata-panel/50' },
  { regex: /bg-slate-800/g, replacement: 'bg-ata-panel' },
  { regex: /bg-slate-900/g, replacement: 'bg-ata-dark' },
  { regex: /slate-800/g, replacement: 'ata-panel' },
  { regex: /slate-900/g, replacement: 'ata-dark' },
  { regex: /ring-slate-200/g, replacement: 'ring-ata-border' },
  { regex: /text-red-700/g, replacement: 'text-rose-400' },
  { regex: /border-green-200/g, replacement: 'border-ata-green/30' },
  { regex: /focus:border-green-500/g, replacement: 'focus:border-ata-green' },
  { regex: /focus:ring-green-500/g, replacement: 'focus:ring-ata-green' },
  { regex: /text-emerald-400/g, replacement: 'text-ata-green' },
  { regex: /bg-blue-500\/20/g, replacement: 'bg-ata-blue/20' },
  { regex: /text-blue-500/g, replacement: 'text-ata-blue' },
  { regex: /bg-blue-50\b/g, replacement: 'bg-ata-blue/10' },
  { regex: /hover:text-blue-\d+/g, replacement: 'hover:text-ata-blue' },
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir(directory, (filePath) => {
  if (filePath.endsWith('.vue')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (let r of replacements) {
      content = content.replace(r.regex, r.replacement);
    }
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${path.basename(filePath)}`);
    }
  }
});