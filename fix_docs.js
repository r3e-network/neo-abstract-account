const fs = require('fs');

function removeLineMatch(file, regex) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.split('\n').filter(line => !regex.test(line)).join('\n');
  fs.writeFileSync(file, content);
}

function replaceMatch(file, regex, replacement) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
}

removeLineMatch('frontend/src/assets/docs/data-flow.md', /Dome Configuration/);
removeLineMatch('frontend/src/assets/docs/security-audit.zh.md', /Dome\/oracle/);

// Fix architecture.md
removeLineMatch('frontend/src/assets/docs/architecture.md', /Optional Dome Oracle/);
removeLineMatch('frontend/src/assets/docs/architecture.md', /DomeCheck/);
removeLineMatch('frontend/src/assets/docs/architecture.md', /AbstractAccount\.Oracle\.cs/);
replaceMatch('frontend/src/assets/docs/architecture.md', /RoleCheck -- Yes --> DomeCheck\{Dome \/ oracle constraints satisfied\?\}/g, 'RoleCheck -- Yes --> PolicyCheck{Whitelist / blacklist / method policy OK?}');
replaceMatch('frontend/src/assets/docs/architecture.md', /RoleCheck -- No --> RejectA\[Abort auth failure\]/g, 'RoleCheck -- No --> RejectA[Abort auth failure]\n  RoleCheck -- Yes --> PolicyCheck{Whitelist / blacklist / method policy OK?}');

// Fix overview.md
removeLineMatch('frontend/src/assets/docs/overview.md', /Dome Social Network/);
removeLineMatch('frontend/src/assets/docs/overview.md', /\*\*Dome Recovery\*\*/);

// Fix guide.zh.md
removeLineMatch('frontend/src/assets/docs/guide.zh.md', /Dome/);

// Fix custom-verifiers.md
replaceMatch('frontend/src/assets/docs/custom-verifiers.md', /Role and Dome structures/g, 'Role structures');

