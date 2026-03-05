import fs from 'fs';
const rawContent = fs.readFileSync('./src/assets/docs/workflow.md', 'utf8');
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang === 'mermaid') {
        return code;
      }
      return code;
    }
  })
);

const renderer = new marked.Renderer();
const originalCode = renderer.code.bind(renderer);
renderer.code = (token) => {
  if (token.lang === 'mermaid') {
    return `<div class="mermaid">\n${token.text}\n</div>`;
  }
  return originalCode(token);
};
marked.use({ renderer });

console.log(marked.parse(rawContent).substring(0, 500));
