import fs from 'fs';
const docContent = fs.readFileSync('./src/assets/architecture.md', 'utf8');
import { marked } from 'marked';
try {
  const result = marked.parse(docContent);
  console.log(result.substring(0, 50));
} catch(e) {
  console.error("Parse error:", e);
}
