const fs = require('fs');
let t = fs.readFileSync('login.html', 'utf8');

const map = {
  'â€”': '—',
  'â… ': 'Ⅰ',
  'â…¡': 'Ⅱ',
  'â…¢': 'Ⅲ',
  'â…£': 'Ⅳ',
  'â…¤': 'Ⅴ',
  'â…¥': 'Ⅵ',
  'â…¦': 'Ⅶ',
  'â• ': '═',
  'â†’': '→',
  'â€¢': '•',
  'â¬‡': '⬇',
  'âœ“': '✓'
};

for (const [bad, good] of Object.entries(map)) {
  t = t.replaceAll(bad, good);
}

fs.writeFileSync('login.html', t, 'utf8');
console.log('Fixed login.html');
