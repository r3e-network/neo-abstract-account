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
    } else {
      if (file.endsWith('.vue')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('/home/neo/git/neo-abstract-account/frontend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Red/Error classes
  content = content.replace(/\bbg-red-50\b/g, 'bg-rose-500/10');
  content = content.replace(/\bborder-red-200\b/g, 'border-rose-500/30');
  content = content.replace(/\bborder-red-300\b/g, 'border-rose-500/40');
  content = content.replace(/\bborder-red-500\b/g, 'border-rose-500/50');
  content = content.replace(/\btext-red-600\b/g, 'text-rose-400');
  content = content.replace(/\btext-red-900\b/g, 'text-rose-400');
  content = content.replace(/\btext-red-500\b/g, 'text-rose-400');
  content = content.replace(/\bbg-red-100\b/g, 'bg-rose-500/10');

  // 2. Green/Success classes
  content = content.replace(/\bbg-green-100\b/g, 'bg-ata-green/10');
  content = content.replace(/\bbg-green-50\b/g, 'bg-ata-green/10');
  content = content.replace(/\btext-green-600\b/g, 'text-ata-green');
  content = content.replace(/\btext-green-800\b/g, 'text-ata-green');
  content = content.replace(/\btext-green-500\b/g, 'text-ata-green');

  // 3. Slate/Light classes
  content = content.replace(/\bbg-slate-50\b/g, 'bg-ata-dark');
  content = content.replace(/\bbg-slate-100\b/g, 'bg-ata-dark');
  content = content.replace(/\bborder-slate-100\b/g, 'border-ata-border');
  content = content.replace(/\bborder-slate-200\b/g, 'border-ata-border');
  content = content.replace(/\bborder-slate-300\b/g, 'border-ata-border');

  // 4. Gradients
  content = content.replace(/\bbg-gradient-to-br from-slate-50 to-white\b/g, 'bg-gradient-to-br from-ata-dark to-ata-panel');
  content = content.replace(/\bfrom-slate-50 to-white\b/g, 'from-ata-dark to-ata-panel');

  // 6. Text slate
  content = content.replace(/\btext-slate-900\b/g, 'text-slate-200');
  content = content.replace(/\btext-slate-800\b/g, 'text-slate-200');
  content = content.replace(/\btext-slate-700\b/g, 'text-slate-200');

  // 5. Inputs
  const tagRegex = /<(input|textarea|select)(\s+[^>]*?)>/g;
  content = content.replace(tagRegex, (match, tag, attrs) => {
    let trailingSlash = '';
    if (attrs.trim().endsWith('/')) {
        trailingSlash = '/';
        attrs = attrs.replace(/\/$/, '');
    }

    const classMatch = attrs.match(/\bclass=(["'])(.*?)\1/);
    if (classMatch) {
      let classes = classMatch[2].split(/\s+/).filter(Boolean);
      let hasBg = classes.some(c => c.startsWith('bg-'));
      let hasText = classes.some(c => c.startsWith('text-'));
      
      if (!hasBg) classes.push('bg-ata-dark');
      if (!hasText) classes.push('text-white');

      attrs = attrs.replace(classMatch[0], `class=${classMatch[1]}${classes.join(' ')}${classMatch[1]}`);
    } else {
      attrs += ' class="bg-ata-dark text-white"';
    }
    
    return `<${tag}${attrs}${trailingSlash}>`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
