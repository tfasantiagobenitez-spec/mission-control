import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const content = fs.readFileSync(envPath, 'utf8');

console.log('--- .env.local Debug ---');
content.split('\n').forEach((line, i) => {
    if (line.includes('GOOGLE_')) {
        const [key, val] = line.split('=');
        console.log(`Line ${i + 1}: ${key}= (Length: ${val?.trim().length})`);
        // Check for non-printable characters
        for (let j = 0; j < (val || '').length; j++) {
            const code = val.charCodeAt(j);
            if (code < 32 || code > 126) {
                console.log(`  Found char code ${code} at index ${j}`);
            }
        }
    }
});
