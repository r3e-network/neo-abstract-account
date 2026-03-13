const fs = require('fs');

let file = 'frontend/src/components/ArchitectureDiagram.vue';
let content = fs.readFileSync(file, 'utf8');

// The node definition
content = content.replace(/\{\s*data: \{ id: 'dome', label: 'Dome Recovery\\n\(Oracles & Timeout\)', type: 'policy', bg: '#F59E0B', border: '#D97706' \}\s*\},\n?/g, '');

// The edges connected to it
content = content.replace(/\{\s*data: \{ source: 'role', target: 'dome', label: 'No' \}\s*\},\n?/g, '');
content = content.replace(/\{\s*data: \{ source: 'dome', target: 'policy', label: 'Yes' \}\s*\},\n?/g, '');
content = content.replace(/\{\s*data: \{ source: 'dome', target: 'reject', label: 'No' \}\s*\},\n?/g, '');

// If the previous edge 'No' from role went to dome, now where does it go? Reject.
content = content.replace(/\{\s*data: \{ source: 'role', target: 'reject', label: 'No' \}\s*\},\n?/g, ''); // Just in case
content = content.replace(/\{\s*data: \{ source: 'role', target: 'policy', label: 'Yes' \}\s*\},\n?/g, "{ data: { source: 'role', target: 'policy', label: 'Yes' } },\n        { data: { source: 'role', target: 'reject', label: 'No' } },\n");


fs.writeFileSync(file, content);
