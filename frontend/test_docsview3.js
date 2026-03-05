import fs from 'fs';
const rawContent = fs.readFileSync('./src/assets/docs/workflow.md', 'utf8');
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang === 'mermaid') {
        return code; // Do not highlight or wrap mermaid text
      }
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  })
);

const renderer = new marked.Renderer();
const originalCode = renderer.code.bind(renderer);
renderer.code = (token) => {
  if (token.lang === 'mermaid') {
    return `<div class="mermaid-wrapper"><div class="mermaid">\n${token.text}\n</div></div>`;
  }
  return originalCode(token);
};
marked.use({ renderer });

console.log("MARKDOWN OUTPUT TEST:");
console.log(marked.parse(rawContent).includes('class="mermaid"'));
console.log(marked.parse(rawContent).substring(0, 500));
