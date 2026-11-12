// merge.js — 罗盘分金合并脚本（V1.6 P1-1 防灾工程化）
//
// 用途：将 assets/part1.html（HTML+CSS+ENGINE 纯函数）+ assets/part2.html（UI 层）
//       合并为单文件 index.html
//
// 合并规则（与 MEMORY.md 工程约定一致）：
//   - part1.html 必须含 `<script>...</script>` 块（含 ENGINE）
//   - part1.html 末尾必须含 `</script></body></html>` 收尾
//   - part2.html 末尾不得含 `</script></body></html>`（纯 UI IIFE）
//   - 合并产物：head + engineScript + `<script>\n` + part2 + `\n</script>\n` + tail
//
// 防灾校验（V1.5 教训：合并错位会让 P0 修复全丢 + 页面变代码）：
//   1. /*ENGINE-START*/ 标记必须存在
//   2. part1 末尾必须含 `</script></body></html>`
//   3. part2 末尾不得含 `</script></body></html>`
//   4. 用 new Function() 校验各 script 块语法 OK
//   5. 写后做 HTML 标签平衡检查（<script> 配对 / <div|main|section|...> 配对）

'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var PART1 = path.join(ROOT, 'assets', 'part1.html');
var PART2 = path.join(ROOT, 'assets', 'part2.html');
var OUT   = path.join(ROOT, 'index.html');

var p1 = fs.readFileSync(PART1, 'utf8');
var p2 = fs.readFileSync(PART2, 'utf8');

function fail(msg) { console.error('[merge.js] 错误: ' + msg); process.exit(1); }
function ok(msg)   { console.log('[merge.js] ✓ ' + msg); }

// === 防灾校验 ===
if (p1.indexOf('/*ENGINE-START*/') < 0) fail('part1.html 缺少 /*ENGINE-START*/ 标记');
/* 校验 part1 末尾含 </script></body></html> 三件套（允许中间有空白换行） */
var tail1 = p1.replace(/\s+/g, '');
if (tail1.indexOf('</script></body></html>') < 0) fail('part1.html 末尾缺少 </script></body></html> 收尾（允许空白分隔）');
/* 校验 part2 末尾不含 </script></body></html>（应为纯 UI IIFE） */
var tail2 = p2.replace(/\s+/g, '');
if (tail2.indexOf('</script></body></html>') >= 0) fail('part2.html 末尾不应含 </script></body></html>（应为纯 UI IIFE）');
ok('part1/part2 收尾标签契约校验通过');

// === 切分合并 ===
var scriptOpenIdx = p1.indexOf('<script>');
if (scriptOpenIdx < 0) fail('part1.html 找不到 <script> 起始标签');

var head = p1.substring(0, scriptOpenIdx);
var rest = p1.substring(scriptOpenIdx);
var scriptCloseIdx = rest.indexOf('</script>');
if (scriptCloseIdx < 0) fail('part1.html <script> 块未闭合');

var engineScript = rest.substring(0, scriptCloseIdx + 9);
var tail = rest.substring(scriptCloseIdx + 9);
var out = head + engineScript + '\n<script>\n' + p2 + '\n</script>\n' + tail;

// === script 块语法校验 ===
var re = /<script[^>]*>([\s\S]*?)<\/script>/g;
var m, idx = 0, syntaxOk = true;
while ((m = re.exec(out)) !== null) {
  idx++;
  try { new Function(m[1]); }
  catch (e) {
    console.error('[merge.js] 错误: script #' + idx + ' 语法错误: ' + e.message);
    syntaxOk = false;
  }
}
if (!syntaxOk) fail('script 块语法校验未通过');
ok('script 块语法校验通过 (' + idx + ' 个块)');

// === HTML 标签平衡检查 ===
var clean = out.replace(/<script[^>]*>[\s\S]*?<\/script>/g, '<!--S-->');
var selfClose = { br:1, hr:1, img:1, input:1, meta:1, link:1, source:1, area:1, base:1, col:1, embed:1, keygen:1, param:1, track:1, wbr:1 };
var opens = {}, closes = {};
var tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)/g;
var mm;
while ((mm = tagRe.exec(clean)) !== null) {
  var t = mm[1].toLowerCase();
  if (t === 'script' || t === '!doctype' || t === '!--' || selfClose[t]) continue;
  // 跳过自闭合写法 <tag/>
  var fullStart = clean.lastIndexOf('<', mm.index);
  var fullEnd = clean.indexOf('>', mm.index);
  if (fullStart >= 0 && fullEnd > fullStart && clean.substring(fullEnd-1, fullEnd) === '/') continue;
  if (mm[0].startsWith('</')) closes[t] = (closes[t]||0) + 1;
  else opens[t] = (opens[t]||0) + 1;
}
var tags = new Set([].concat(Object.keys(opens), Object.keys(closes)));
var unbalanced = [];
tags.forEach(function (t) {
  var o = opens[t] || 0, c = closes[t] || 0;
  if (o !== c) unbalanced.push('<' + t + '> 开=' + o + ' 闭=' + c);
});
if (unbalanced.length) fail('HTML 标签不平衡: ' + unbalanced.join('; '));
ok('HTML 标签平衡校验通过');

// === 写入 ===
fs.writeFileSync(OUT, out, 'utf8');
ok('index.html 已生成 (' + out.length + ' bytes, ' + idx + ' script 块)');
