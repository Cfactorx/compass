const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* 1. 解析 WMM_2025.COF */
const cof = fs.readFileSync(path.join(ROOT, 'assets/WMM_2025.COF'), 'utf8').trim().split(/\r?\n/);
const rows = [];
for (const line of cof) {
  const t = line.trim().split(/\s+/);
  if (t.length !== 6) continue;
  const nums = t.map(Number);
  if (nums.some(isNaN)) continue;
  rows.push(nums);
}
console.log('COF rows:', rows.length);

/* 2. 与 assets/wmm2025.js 对照（双源校验） */
const src = fs.readFileSync(path.join(ROOT, 'assets/wmm2025.js'), 'utf8');
const W = eval(src + ';WMM2025;');
let ok = rows.length === W.c.length;
rows.forEach((r, i) => {
  if (r.join(',') !== W.c[i].join(',')) { ok = false; console.log('js mismatch at', i, r, W.c[i]); }
});
console.log('wmm2025.js matches COF:', ok);

/* 3. 替换 part1.html 中的 WMM2025 行（按行匹配，避免复杂正则） */
const jsLine = 'var WMM2025={epoch:2025,c:[' + rows.map(r => '[' + r.join(',') + ']').join(',') + ']};';
const lines = fs.readFileSync(path.join(ROOT, 'assets/part1.html'), 'utf8').split('\n');
let found = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('var WMM2025={epoch:2025,c:[') === 0) { found = i; break; }
}
if (found < 0) { console.log('ERROR: WMM2025 line not found in part1.html'); process.exit(1); }
lines[found] = jsLine;
const p1new = lines.join('\n');
fs.writeFileSync(path.join(ROOT, 'assets/part1.html'), p1new);
console.log('part1.html WMM2025 replaced at line', found + 1, ', line length:', jsLine.length);

/* 4. 重新合并 index.html */
const p2 = fs.readFileSync(path.join(ROOT, 'assets/part2.html'), 'utf8');
fs.writeFileSync(path.join(ROOT, 'index.html'), p1new + p2);
console.log('index.html regenerated:', (p1new + p2).length, 'bytes');
