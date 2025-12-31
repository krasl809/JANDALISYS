
const fs = require('fs');
const filePath = 'd:\\SAM-Work\\GM\\erp-2025\\Finance\\cashflow_system1\\cashflow_system\\client\\src\\i18n\\il8n.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const arStartLine = lines.findIndex(l => l.includes('ar: {'));
const translationStartLine = lines.findIndex((l, i) => i > arStartLine && l.includes('translation: {'));

const keys = new Map();
const duplicates = [];
const uniqueAfterThreshold = [];
const threshold = 2294;

let braceLevel = 0;
let inTranslation = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (i === translationStartLine) {
        inTranslation = true;
        braceLevel = 1;
        continue;
    }

    if (!inTranslation) continue;

    const openBraces = (trimmed.match(/{/g) || []).length;
    const closeBraces = (trimmed.match(/}/g) || []).length;

    if (braceLevel === 1) {
        const keyMatch = trimmed.match(/^"([^"]+)"\s*:/) || trimmed.match(/^([a-zA-Z0-9_]+)\s*:/);
        if (keyMatch) {
            const key = keyMatch[1];
            if (keys.has(key)) {
                duplicates.push({ key, line: i + 1, originalLine: keys.get(key) });
            } else {
                keys.set(key, i + 1);
                if (i + 1 > threshold) {
                    uniqueAfterThreshold.push({ key, line: i + 1 });
                }
            }
        }
    }

    braceLevel += openBraces - closeBraces;
    if (braceLevel === 0) break;
}

console.log("--- DUPLICATES FOUND ---");
console.log(JSON.stringify(duplicates, null, 2));
console.log("Total duplicates: " + duplicates.length);
