const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\cheto\\Downloads\\LARIS ACESSÓRIOS\\APLICATIVOS\\ERP\\ERP-LOJA\\src\\pages\\inventory\\InventoryPage.tsx', 'utf8');

let inString = false;
let quoteChar = '';
let inBlockComment = false;
let inLineComment = false;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const next = content[i + 1] || '';
  const prev = content[i - 1] || '';

  // Handle String toggle
  if (!inBlockComment && !inLineComment) {
    if ((c === '"' || c === "'" || c === '`') && prev !== '\\') {
      if (!inString) {
        inString = true;
        quoteChar = c;
      } else if (quoteChar === c) {
        inString = false;
      }
    }
  }

  if (!inString) {
    // Handle Block Comment
    if (c === '/' && next === '*') {
      inBlockComment = true;
      i++; continue;
    }
    if (c === '*' && next === '/' && inBlockComment) {
      inBlockComment = false;
      i++; continue;
    }

    // Handle Line Comment
    if (c === '/' && next === '/') {
      inLineComment = true;
      i++; continue;
    }
    if (c === '\n' && inLineComment) {
      inLineComment = false;
    }
  }

  // Check for naked slash
  if (!inString && !inBlockComment && !inLineComment) {
    if (c === '/' && next !== '/' && next !== '*' && prev !== '<' && next !== '>') {
      // It's a slash that isn't //, /*, </, or />
      const lineNum = content.substring(0, i).split('\n').length;
      const context = content.substring(Math.max(0, i - 10), Math.min(content.length, i + 30)).replace(/\n/g, ' ');
      console.log(`Line ${lineNum}: Naked slash found at "${context}"`);
    }
  }
}
