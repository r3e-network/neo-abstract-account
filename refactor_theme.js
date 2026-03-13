const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.vue')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(path.join(__dirname, 'frontend/src'));

let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Backgrounds
  content = content.replace(/\bbg-white\b/g, 'bg-ata-panel');
  content = content.replace(/\bbg-slate-50\b/g, 'bg-ata-panel');
  content = content.replace(/\bbg-slate-100\b/g, 'bg-ata-panel');
  content = content.replace(/\bbg-slate-800\b/g, 'bg-ata-panel');
  content = content.replace(/\bbg-slate-900\b/g, 'bg-ata-dark');

  // Borders
  content = content.replace(/\bborder-slate-200\b/g, 'border-ata-border');
  content = content.replace(/\bborder-slate-300\b/g, 'border-ata-border');
  content = content.replace(/\bborder-slate-700(\/[0-9]+)?\b/g, 'border-ata-border');
  content = content.replace(/\bborder-slate-800\b/g, 'border-ata-border');

  // Text colors
  content = content.replace(/\btext-slate-900\b/g, 'text-white');
  content = content.replace(/\btext-slate-800\b/g, 'text-slate-200');
  content = content.replace(/\btext-slate-700\b/g, 'text-slate-300');
  content = content.replace(/\btext-slate-600\b/g, 'text-slate-400');
  content = content.replace(/\btext-slate-500\b/g, 'text-slate-400');
  
  // Neo colors to ATA colors
  // Replace neo-100, neo-500 etc. with ata-green
  content = content.replace(/\b(bg|text|border|ring|shadow|from|to|via)-neo-[0-9]+\b/g, '$1-ata-green');
  
  // Custom shadow with rgba for neo-500 (34,197,94) to ata-green (0,255,102)
  content = content.replace(/rgba\(34,197,94/g, 'rgba(0,255,102');

  // Hover states for neo
  content = content.replace(/\bhover:(bg|text|border|ring|shadow|from|to|via)-neo-[0-9]+\b/g, 'hover:$1-ata-green');

  // Focus states
  content = content.replace(/\bfocus:(bg|text|border|ring|shadow|from|to|via)-neo-[0-9]+\b/g, 'focus:$1-ata-green');
  
  // active states
  content = content.replace(/\bactive:(bg|text|border|ring|shadow|from|to|via)-neo-[0-9]+\b/g, 'active:$1-ata-green');

  // group-hover states
  content = content.replace(/\bgroup-hover:(bg|text|border|ring|shadow|from|to|via)-neo-[0-9]+\b/g, 'group-hover:$1-ata-green');

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Refactored ${changedFiles} files.`);
