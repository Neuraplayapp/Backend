const fs = require('fs');
const path = 'src/ai/handlers/ChatHandler.ts';
let buffer = fs.readFileSync(path);
let content = buffer.toString('utf8');

// Fix remaining mojibake patterns
const replacements = [
  // goal emoji: 🌍Ÿ → 🌟
  ['🌍Ÿ', '🌟'],
  // family emoji: â¤ï¸ → ❤️
  ['â¤ï¸', '❤️'],
  // profession emoji: 👍¼ → 💼
  ['👍¼', '💼'],
  // location emoji: 🔍 → 📍  
  ['🔍', '📍'],
  // education emoji: 🔍š → 🎓
  ['🔍š', '🎓'],
  // finance emoji: 👍° → 💰
  ['👍°', '💰'],
  // relationship emoji: 👍• → 💕
  ['👍•', '💕'],
];

let count = 0;
for (const [broken, correct] of replacements) {
  if (content.includes(broken)) {
    const matches = content.split(broken).length - 1;
    content = content.split(broken).join(correct);
    count += matches;
    console.log(`Replaced ${matches} instances of "${broken}" with "${correct}"`);
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log(`\nFixed ${count} total mojibake occurrences!`);

