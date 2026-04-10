const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cheto\\Downloads\\LARIS ACESSÓRIOS\\APLICATIVOS\\ERP\\ERP-LOJA\\src\\pages\\inventory\\InventoryPage.tsx', 'utf8');

function countOccurrences(str, char) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === char) count++;
  }
  return count;
}

const backticks = countOccurrences(content, '`');
const singleQuotes = countOccurrences(content, "'");
const doubleQuotes = countOccurrences(content, '"');

console.log('Backticks:', backticks);
console.log('Single Quotes:', singleQuotes);
console.log('Double Quotes:', doubleQuotes);
