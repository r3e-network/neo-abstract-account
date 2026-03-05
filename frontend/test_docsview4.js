import fs from 'fs';
const rawContent = fs.readFileSync('./src/assets/docs/workflow.md', 'utf8');
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

const marked = new Marked();

const renderer = new marked.Renderer();
const originalCode = renderer.code.bind(renderer);
renderer.code = (token) => {
  if (token.lang === 'mermaid') {
    return `<div class="mermaid">\n${token.text}\n</div>`;
  }
  return originalCode(token);
};
marked.use({ renderer });

console.log("MARKDOWN OUTPUT WITHOUT HIGHLIGHT PLUGIN:");
console.log(marked.parse(rawContent).includes('class="mermaid"'));
console.log(marked.parse(rawContent).substring(0, 500));
