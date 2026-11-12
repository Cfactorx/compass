/* =====================================================================
 * ui_static.js — H5 UI 层静态一致性校验（Node 环境）
 * 用法: node tests/ui_static.js  /  node tests/ui_static.js --selftest
 *
 * 背景（V1.6.2 新增）：
 *   引擎测试（tests/run.js，181 断言）只覆盖 ENGINE 纯函数区，
 *   对 part2.html 的 UI 代码零覆盖。结果「地图量测 → 保存记录」按钮
 *   长期存在三重叠加错误（E.GEO.gcjToWgs 不存在、sit[0] 取对象属性、
 *   bearing() 裸调用跨作用域）却没有任何测试能发现。
 *
 * 本文件补上这一层：不做 DOM 渲染，而是做「跨文件符号一致性」校验——
 * 这正是上述 bug 的共同性质（UI 调用了引擎不存在的成员 / 用错返回类型）。
 *
 * 检查项：
 *   U1  UI 中所有 E.<NS>.<member> 引用必须存在于引擎导出中
 *   U2  getSit()/getFace() 返回对象，UI 不得对其结果做数组下标访问
 *   U3  引擎内部函数不得在 UI 层裸调用（必须经 E.GEO.* / E.GEOMAG.*）
 *   U4  UI 调用的引擎方法参数个数与引擎声明一致
 *   U5  --selftest 反向验证：把原 bug 代码注入夹具，断言 U1/U2/U3 确实报错
 * ===================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var PART1 = path.join(ROOT, 'assets', 'part1.html');
var PART2 = path.join(ROOT, 'assets', 'part2.html');

/* ---------- 引擎能力表（从 part1.html 现场提取，非硬编码）---------- */
function loadEngineApi() {
  var html = fs.readFileSync(PART1, 'utf8');
  var m = html.match(/\/\*ENGINE-START\*\/([\s\S]*?)\/\*ENGINE-END\*\//);
  if (!m) throw new Error('part1.html 中未找到 ENGINE 区');
  var LP = new Function(m[1] + '\nreturn LP;')();
  var api = { ROOT: {} };
  Object.keys(LP).forEach(function (k) {
    if (LP[k] && typeof LP[k] === 'object' && !Array.isArray(LP[k])) {
      api[k] = {};
      Object.keys(LP[k]).forEach(function (kk) { api[k][kk] = LP[k][kk]; });
    } else {
      api.ROOT[k] = LP[k];
    }
  });
  api.ROOT.LP = LP;
  return { api: api, LP: LP };
}

/* ---------- 引擎内部函数名（裸调用即错误）---------- */
var ENGINE_INTERNALS = (function () {
  var html = fs.readFileSync(PART1, 'utf8');
  var m = html.match(/\/\*ENGINE-START\*\/([\s\S]*?)\/\*ENGINE-END\*\//);
  var names = [];
  var re = /function\s+([A-Za-z_$][\w$]*)\s*\(/g, mm;
  while ((mm = re.exec(m[1]))) names.push(mm[1]);
  return names;
})();

/* ---------- 去注释 ----------
 * 必须先去注释再分析：本工程习惯在注释里写"修复说明"（例如
 * 「E.GEO.gcjToWgs 不存在」这样的描述），不去注释会把说明文字当成缺陷。
 * 实现要点：块注释替换为等量换行，保证行号不变（U2 报错要给出准确行号）；
 * 行注释注意保留 "://" 里的双斜杠。 */
function blank(m) { return m.replace(/[^\n]/g, ' '); }
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
    .replace(/<!--[\s\S]*?-->/g, blank);
}

/* =====================================================================
 * 分析器（纯函数，便于夹具复用）
 * ===================================================================== */
function analyze(uiRawSrc, api) {
  var uiSrc = stripComments(uiRawSrc);
  var errs = [];

  /* ---- U1: E.<NS>.<member> 必须存在 ---- */
  var re1 = /\bE\.([A-Z][A-Za-z0-9_]*)\.([A-Za-z_$][\w$]*)/g, m;
  var seen1 = {};
  while ((m = re1.exec(uiSrc))) {
    var ns = m[1], mem = m[2];
    var key = ns + '.' + mem;
    if (seen1[key]) continue;
    seen1[key] = true;
    if (!api[ns]) {
      errs.push({ check: 'U1', msg: 'E.' + ns + ' 不是引擎导出的命名空间（可用：' +
        Object.keys(api).filter(function (k) { return k !== 'ROOT'; }).join(', ') + '）' });
    } else if (!(mem in api[ns])) {
      errs.push({ check: 'U1', msg: '引擎命名空间 ' + ns + ' 上不存在成员 ' + mem +
        '（现有：' + Object.keys(api[ns]).join(', ') + '）' });
    }
  }
  /* 同时校验 E.<topLevel> 顶层引用 */
  var re1b = /\bE\.([A-Za-z_$][\w$]*)\b(?!\s*[.:])/g, mb;
  var seen1b = {};
  while ((mb = re1b.exec(uiSrc))) {
    var name = mb[1];
    if (seen1b[name]) continue;
    seen1b[name] = true;
    if (name === 'GEO' || name === 'GEOMAG' || name === 'STORE') continue;  /* 命名空间已在 U1 覆盖 */
    if (!(name in api.ROOT)) {
      errs.push({ check: 'U1', msg: '引擎顶层不存在导出 ' + name });
    }
  }

  /* ---- U2: getSit()/getFace() 结果不得做数组下标 ---- */
  if (/\bsit\s*\[/.test(uiSrc) || /\bface\s*\[/.test(uiSrc)) {
    var lines = uiSrc.split('\n');
    lines.forEach(function (ln, i) {
      if (/\b(sit|face)\s*\[/.test(ln)) {
        errs.push({ check: 'U2', msg: '第 ' + (i + 1) + ' 行对 getSit()/getFace() 的结果做了数组下标访问，' +
          '但二者返回 {lat,lng} 对象：' + ln.trim().slice(0, 70) });
      }
    });
  }

  /* ---- U3: 引擎内部函数裸调用 ---- */
  ENGINE_INTERNALS.forEach(function (fn) {
    var re3 = new RegExp('(^|[^.\\w$])' + fn + '\\s*\\(', 'g');
    var mm3 = uiSrc.match(re3);
    if (!mm3) return;
    /* 命中需排除：UI 自己定义的同名函数 */
    var uiDefined = new RegExp('function\\s+' + fn + '\\s*\\(').test(uiSrc);
    if (uiDefined) return;
    errs.push({ check: 'U3', msg: '引擎内部函数 ' + fn + '() 在 UI 层被裸调用（作用域不可见），' +
      '应改为 E.GEO.' + fn + ' 等命名空间调用。命中 ' + mm3.length + ' 处' });
  });

  /* ---- U4: 参数个数一致性 ---- */
  var re4 = /\bE\.([A-Z][A-Za-z0-9_]*)\.([A-Za-z_$][\w$]*)\s*\(([^()]*)\)/g, m4;
  var seen4 = {};
  while ((m4 = re4.exec(uiSrc))) {
    var ns4 = m4[1], mem4 = m4[2], argsRaw = m4[3];
    if (!api[ns4] || typeof api[ns4][mem4] !== 'function') continue;
    if (argsRaw.indexOf('(') >= 0 || argsRaw.indexOf('function') >= 0) continue;
    /* 拆分顶层逗号 */
    var depth = 0, cnt = 0, trimmed = argsRaw.trim();
    if (trimmed !== '') {
      cnt = 1;
      for (var i = 0; i < argsRaw.length; i++) {
        var ch = argsRaw[i];
        if (ch === '(' || ch === '[' || ch === '{') depth++;
        else if (ch === ')' || ch === ']' || ch === '}') depth--;
        else if (ch === ',' && depth === 0) cnt++;
      }
    }
    var declared = api[ns4][mem4].length;
    /* 去重键必须包含实参个数：同一函数可能先以正确个数出现、再以错误个数出现，
       若只按函数名去重，后一处错误会被漏报（顺序相关的假阴性） */
    var dkey = ns4 + '.' + mem4 + '#' + cnt + '/' + declared;
    if (seen4[dkey]) continue;
    seen4[dkey] = true;
    if (cnt > declared && declared > 0) {
      errs.push({ check: 'U4', msg: 'E.' + ns4 + '.' + mem4 + '() 传了 ' + cnt +
        ' 个实参，但引擎只声明 ' + declared + ' 个形参' });
    }
  }

  return errs;
}

/* =====================================================================
 * 主流程
 * ===================================================================== */
function runReal() {
  var loaded = loadEngineApi();
  var uiSrc = fs.readFileSync(PART2, 'utf8');
  var errs = analyze(uiSrc, loaded.api);

  var nsList = Object.keys(loaded.api).filter(function (k) { return k !== 'ROOT'; });
  console.log('[ui_static] 引擎命名空间：' + nsList.join(', ') +
              ' · 顶层导出 ' + Object.keys(loaded.api.ROOT).length + ' 项');
  console.log('[ui_static] 引擎内部函数 ' + ENGINE_INTERNALS.length + ' 个（裸调用黑名单）');

  if (errs.length) {
    console.error('\n[ui_static] ✗ 发现 ' + errs.length + ' 处跨文件不一致：');
    errs.forEach(function (e) { console.error('  ✗ [' + e.check + '] ' + e.msg); });
    process.exit(1);
  }
  console.log('[ui_static] ✓ U1–U4 全部通过：UI 对引擎的 ' + '所有引用均一致，无跨作用域裸调用');
}

function runSelftest() {
  var loaded = loadEngineApi();
  /* 夹具 = 修复前的 part2.html 关键片段（含三重错误） */
  var fixture = [
    "(function bindPersistentActions(){",
    "  var bSM = $('btnSaveMap'); if (bSM) bSM.onclick = function(){",
    "    var sit = mapView.getSit(), face = mapView.getFace();",
    "    var wgsS = E.GEO.gcjToWgs(sit[0], sit[1]), wgsF = E.GEO.gcjToWgs(face[0], face[1]);",
    "    var mid = E.GEO.midpoint(wgsS[0], wgsS[1], wgsF[0], wgsF[1]);",
    "    var D = state.declKnown ? state.decl : 0;",
    "    var T = bearing(sit, face), M = E.norm(T - D);",
    "    var dist = E.GEO.distance(wgsS[0], wgsS[1], wgsF[0], wgsF[1]);",
    "    var r = E.analyze(E.norm((state.settings.trueNorthMode ? T : M) + 180), state.settings);",
    "    saveRecord('map', r, { sit:sit, face:face, T:T, M:M, D:D, dist:dist });",
    "  };",
    "  var bad = E.NOT_A_NS.foo();",
    "  var bad2 = E.notExportedTopLevel;",
    "  var bad3 = E.GEO.distance(1,2,3,4,5,6);",
    "})();"
  ].join('\n');

  var errs = analyze(fixture, loaded.api);
  var got = {};
  errs.forEach(function (e) { got[e.check] = (got[e.check] || 0) + 1; });

  var EXPECT = ['U1', 'U2', 'U3', 'U4'];
  console.log('[ui_static --selftest] 夹具检出统计：');
  EXPECT.forEach(function (c) {
    console.log('  ' + (got[c] ? '✓' : '✗') + ' ' + c + '  命中 ' + (got[c] || 0) + ' 条');
  });
  var missing = EXPECT.filter(function (c) { return !got[c]; });
  if (missing.length) {
    console.error('\n[ui_static --selftest] ✗ 反向验证失败：' + missing.join(', ') +
      ' 未在缺陷夹具上报错 → 检查已失效（恒通过假阳性）');
    process.exit(1);
  }

  /* 再验证阴性样本：干净的宿主代码不得误报 */
  var clean = [
    "var sit = mapView.getSit(), face = mapView.getFace();",
    "var wgsS = E.GEO.gcj02ToWgs84(sit.lat, sit.lng), wgsF = E.GEO.gcj02ToWgs84(face.lat, face.lng);",
    "var T = E.GEO.bearing(wgsS[0], wgsS[1], wgsF[0], wgsF[1]);",
    "var dist = E.GEO.distance(wgsS[0], wgsS[1], wgsF[0], wgsF[1]);",
    "var r = E.analyze(E.norm(T + 180), state.settings);"
  ].join('\n');
  var cleanErrs = analyze(clean, loaded.api);
  if (cleanErrs.length) {
    console.error('\n[ui_static --selftest] ✗ 误报：修复后的正确写法被判定为错误 →');
    cleanErrs.forEach(function (e) { console.error('   ' + e.check + ' ' + e.msg); });
    process.exit(1);
  }
  console.log('  ✓ 阴性样本（修复后的正确写法）零误报');

  console.log('\n[ui_static --selftest] ✓ 反向验证通过：' + EXPECT.length + '/' + EXPECT.length +
              ' 个检查项正确报错，且无假阳性');
}

if (process.argv.indexOf('--selftest') >= 0) runSelftest();
else runReal();
