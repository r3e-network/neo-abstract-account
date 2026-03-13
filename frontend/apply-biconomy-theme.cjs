const fs = require('fs');

let configPath = 'frontend/tailwind.config.js';
let config = fs.readFileSync(configPath, 'utf8');

// Replace ATA's green/blue with Biconomy's bold orange gradient palette
config = config.replace(
  /colors: \{\s*ata: \{[\s\S]*?\},/,
  `colors: {
        biconomy: {
          orange: '#FF4400',
          darkOrange: '#CC3600',
          lightOrange: '#FF6A33',
          dark: '#0A0A0A',
          panel: '#141414',
          border: '#292929',
          text: '#FAFAFA',
          muted: '#A3A3A3'
        },
        ata: {`
);

fs.writeFileSync(configPath, config);
