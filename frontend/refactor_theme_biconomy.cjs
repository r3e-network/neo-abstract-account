const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

function processFile(filePath) {
  if (!filePath.endsWith('.vue') && !filePath.endsWith('.css') && !filePath.endsWith('.js')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Replace ATA classes with Biconomy equivalent
  content = content.replace(/bg-ata-dark/g, 'bg-biconomy-dark');
  content = content.replace(/bg-ata-panel/g, 'bg-biconomy-panel');
  content = content.replace(/border-ata-border/g, 'border-biconomy-border');
  
  // Replace the neon green accents with Biconomy's bold orange
  content = content.replace(/bg-ata-green/g, 'bg-biconomy-orange');
  content = content.replace(/text-ata-green/g, 'text-biconomy-orange');
  content = content.replace(/border-ata-green/g, 'border-biconomy-orange');
  content = content.replace(/ring-ata-green/g, 'ring-biconomy-orange');
  content = content.replace(/focus:border-ata-green/g, 'focus:border-biconomy-orange');
  content = content.replace(/focus:ring-ata-green/g, 'focus:ring-biconomy-orange');

  // Replace secondary blue highlights with orange variants
  content = content.replace(/bg-ata-blue/g, 'bg-biconomy-lightOrange');
  content = content.replace(/text-ata-blue/g, 'text-biconomy-lightOrange');
  content = content.replace(/border-ata-blue/g, 'border-biconomy-lightOrange');

  // Ensure slate-300 / slate-400 are mapped to Biconomy's stark text contrast
  content = content.replace(/text-slate-300/g, 'text-biconomy-text');
  content = content.replace(/text-slate-400/g, 'text-biconomy-muted');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
  }
}

walkDir('frontend/src', processFile);
console.log("Global theme replacement completed.");
