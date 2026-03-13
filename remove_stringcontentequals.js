const fs = require('fs');
let file = 'contracts/AbstractAccount.Oracle.cs';
let content = fs.readFileSync(file, 'utf8');

// Replace the entire StringContentEquals function definition
let regex = /\s*private static bool StringContentEquals\(string\? left, string\? right\)\s*\{\s*if \(left == null \|\| right == null\) return left == right;\s*if \(left\.Length != right\.Length\) return false;\s*for \(int i = 0; i < left\.Length; i\+\+\)\s*\{\s*if \(left\[i\] != right\[i\]\) return false;\s*\}\s*return true;\s*\}/g;

content = content.replace(regex, '');
fs.writeFileSync(file, content);
