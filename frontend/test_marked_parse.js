import { marked } from 'marked';
console.log(typeof marked);
console.log(typeof marked.parse);
console.log(marked.parse('# Hello\n\nWorld.'));
