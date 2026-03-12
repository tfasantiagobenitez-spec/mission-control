
const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\benit\\.openclaw\\debug-gateway.log', 'utf16le');
console.log(content.split('\n').slice(-50).join('\n'));
