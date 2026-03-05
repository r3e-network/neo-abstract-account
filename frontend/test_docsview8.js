import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      return code;
    }
  })
);
const renderer = new marked.Renderer();
const orig = renderer.code.bind(renderer);
renderer.code = (token) => {
  if (token.lang === 'mermaid') {
     return `<div class="mermaid">${token.text}</div>`;
  }
  return orig(token);
};
marked.use({ renderer });

console.log(marked.parse("```mermaid\ngraph TD\n```"));
