const regex = /(\\epsilon|\\e|epsilon|''|""|I)|([A-Z])|([a-z0-9_]+)|([^A-Za-z0-9_\s])/g;
const str = 'aSa | aa';
const tokens = [];
let match;
while ((match = regex.exec(str)) !== null) { tokens.push(match[0]); }
console.log("Original tokenizer:", tokens);

const regex2 = /(\\epsilon|\\e|epsilon|''|""|I)|([A-Z])|([a-z0-9_])|([^A-Za-z0-9_\s])/g;
const tokens2 = [];
let match2;
while ((match2 = regex2.exec(str)) !== null) { tokens2.push(match2[0]); }
console.log("New tokenizer:", tokens2);
