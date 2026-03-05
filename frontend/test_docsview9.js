import { Marked } from 'marked';
const marked = new Marked();

const rawContent = `
## 1. Account Initialization

No code needs to be deployed by a user. The user simply dictates an initialization payload to the global \`Master Entry Contract\`.

\`\`\`mermaid
sequenceDiagram
    actor User as User (dApp/Wallet)
    participant Master as Master Entry Contract (Neo N3)
    
    User->>Master: createAccountWithAddress(accountId, accountAddress, admins, managers)
    activate Master
    Master->>Master: Assert: Ensure accountId is not already registered
    Master->>Master: Compute: Verify accountAddress mathematically matches accountId script
    Master->>Master: Storage: Bind Admins and Managers to internal state maps
    Master-->>User: Emit AccountCreated Event
    deactivate Master
\`\`\`
`;

const renderer = new marked.Renderer();
const originalCode = renderer.code.bind(renderer);
renderer.code = (token) => {
  if (token.lang === 'mermaid') {
    return `<div class="mermaid-wrapper"><div class="mermaid">\n${token.text}\n</div></div>`;
  }
  return originalCode(token);
};
marked.use({ renderer });

console.log(marked.parse(rawContent));
