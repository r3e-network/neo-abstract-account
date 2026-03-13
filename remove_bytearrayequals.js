const fs = require('fs');
let file = 'contracts/AbstractAccount.MetaTx.cs';
let content = fs.readFileSync(file, 'utf8');

// Replace the entire ByteArrayEquals function definition
let regex = /\s*private static bool ByteArrayEquals\(byte\[\] left, byte\[\] right\)\s*\{\s*if \(left\.Length != right\.Length\) return false;\s*for \(int i = 0; i < left\.Length; i\+\+\)\s*\{\s*if \(left\[i\] != right\[i\]\) return false;\s*\}\s*return true;\s*\}/g;

content = content.replace(regex, '');
fs.writeFileSync(file, content);
