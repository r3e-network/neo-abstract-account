import { Marked } from 'marked';
const marked = new Marked();
const renderer = new marked.Renderer();
renderer.code = (token) => {
  return "MAPPED:" + token.lang;
};
marked.use({ renderer });

console.log(marked.parse("```mermaid\ngraph TD\n```"));
