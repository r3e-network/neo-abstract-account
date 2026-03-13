import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory() && !file.includes('node_modules')) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.vue') || file.endsWith('.css')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk(path.join(__dirname, 'src'));

let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. Replace slate backgrounds
    content = content.replace(/hover:bg-slate-700(?:\/(?:40|50|60))?/g, 'hover:bg-ata-dark');
    content = content.replace(/hover:bg-slate-800(?:\/(?:40|50|60))?/g, 'hover:bg-ata-dark');
    content = content.replace(/bg-slate-700(?:\/(?:40|50|60))?/g, 'bg-ata-dark');
    content = content.replace(/bg-slate-800(?:\/(?:40|50|60))?/g, 'bg-ata-dark');

    // 2. Standardize text-slate-100 and 200 to 300
    content = content.replace(/\btext-slate-100\b/g, 'text-slate-300');
    content = content.replace(/\btext-slate-200\b/g, 'text-slate-300');

    // 3. Replace generic large dark shadows
    content = content.replace(/shadow-\[0_8px_32px_rgba\(0,0,0,0\.5\)\]/g, 'shadow-[0_0_15px_rgba(0,163,255,0.05)]');
    content = content.replace(/shadow-\[0_4px_20px_rgba\(0,0,0,0\.2\)\]/g, 'shadow-[0_0_15px_rgba(0,163,255,0.05)]');

    // 4. Panel headers and buttons uppercase tracking-widest font-mono
    if (file.endsWith('.vue')) {
        // Headers h2, h3, h4
        content = content.replace(/<h([2-4])([^>]*)class="([^"]+)"/g, (match, tag, beforeClass, classes) => {
            let cls = classes.split(' ');
            if (!cls.includes('uppercase')) cls.push('uppercase');
            if (!cls.includes('tracking-widest')) cls.push('tracking-widest');
            if (!cls.includes('font-mono')) cls.push('font-mono');
            return `<h${tag}${beforeClass}class="${cls.join(' ')}"`;
        });
        
        // Let's also apply this to <summary class="...">
        content = content.replace(/<summary([^>]*)class="([^"]+)"/g, (match, beforeClass, classes) => {
            let cls = classes.split(' ');
            if (!cls.includes('uppercase')) cls.push('uppercase');
            if (!cls.includes('tracking-widest')) cls.push('tracking-widest');
            if (!cls.includes('font-mono')) cls.push('font-mono');
            return `<summary${beforeClass}class="${cls.join(' ')}"`;
        });
    }

    if (file.endsWith('.css')) {
        const btns = ['\\.btn-primary', '\\.btn-secondary', '\\.btn-warning', '\\.btn-danger', '\\.btn-ghost'];
        btns.forEach(btn => {
            const regex = new RegExp(`(${btn}\\s*\\{[^}]*@apply[^;]+)(;)`, 'g');
            content = content.replace(regex, (match, p1, p2) => {
                let res = p1;
                if (!res.includes('uppercase')) res += ' uppercase';
                if (!res.includes('tracking-widest')) res += ' tracking-widest';
                if (!res.includes('font-mono')) res += ' font-mono';
                return res + p2;
            });
        });
    }

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedFiles++;
        console.log(`Updated ${file}`);
    }
});
console.log(`Total files updated: ${changedFiles}`);