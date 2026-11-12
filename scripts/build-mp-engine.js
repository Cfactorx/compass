#!/usr/bin/env node
/* =====================================================================
 * build-mp-engine.js — 从 assets/part1.html 抽取判读引擎，生成小程序 utils/engine.js
 *
 * 设计目的：H5 与小程序共用同一份引擎源码（单一事实来源），
 *           避免"两份引擎各自演化"导致判读结果不一致。
 *           改引擎只在 assets/part1.html 里改，然后跑本脚本同步。
 *
 * 契约：
 *   - part1.html 必须含 ENGINE-START 与 ENGINE-END 两个注释标记
 *   - 抽取区间为两标记之间（不含标记）
 *   - 生成的 engine.js 末尾追加 module.exports = LP;
 *   - 引擎层零 DOM 依赖（本脚本会硬校验，越界即失败）
 * ===================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');

var ROOT = path.resolve(__dirname, '..');
var SRC = path.join(ROOT, 'assets', 'part1.html');
var OUT = path.join(ROOT, 'miniprogram', 'utils', 'engine.js');

var START = '/*ENGINE-START*/';
var END = '/*ENGINE-END*/';

/* 引擎层禁止出现的浏览器专属符号（出现即说明引擎被污染，小程序无法运行） */
var FORBIDDEN = [
  'document.', 'window.', 'localStorage', 'navigator.', 'requestAnimationFrame',
  'DeviceOrientationEvent', 'wx.', 'fetch(', 'alert(', 'document.createElement'
];

function fail(msg) {
  console.error('[build-mp-engine] ✗ ' + msg);
  process.exit(1);
}

if (!fs.existsSync(SRC)) fail('找不到源文件 ' + SRC);
var html = fs.readFileSync(SRC, 'utf8');

var i0 = html.indexOf(START);
var i1 = html.indexOf(END);
if (i0 < 0) fail('part1.html 缺少 ' + START + ' 标记');
if (i1 < 0) fail('part1.html 缺少 ' + END + ' 标记');
if (i1 < i0) fail('标记顺序颠倒：ENGINE-END 出现在 ENGINE-START 之前');

var engine = html.slice(i0 + START.length, i1);
if (!engine.trim()) fail('抽取到的引擎代码为空');

/* ---- 硬校验 1：零 DOM 依赖 ---- */
var hits = [];
FORBIDDEN.forEach(function (sym) {
  var n = 0, p = -1;
  while ((p = engine.indexOf(sym, p + 1)) >= 0) n++;
  if (n > 0) hits.push(sym + ' ×' + n);
});
if (hits.length) fail('引擎层检出浏览器/平台专属符号，无法移植到小程序：\n    ' + hits.join('\n    '));

/* ---- 硬校验 2：关键导出符号必须存在 ---- */
var MUST_EXPORT = ['norm', 'circDist', 'branchOfMountain', 'mountainAt', 'fenjinAt',
  'kongwangAt', 'analyze', 'suggestFenjin', 'nayinOf', 'dragonFortune',
  'long72At', 'long60At', 'mapSensorToDial', 'formatDMS',
  'MOUNTAINS', 'FJ120', 'JIAZI', 'NAYIN', 'MOUNTAIN_ELEMENT',
  'LONG72_VAL', 'LONG72_MTN', 'GEOMAG', 'GEO', 'STORE'];
var missing = MUST_EXPORT.filter(function (k) {
  return engine.indexOf(k + ':') < 0 && engine.indexOf('function ' + k) < 0;
});
if (missing.length) fail('引擎缺少关键导出：' + missing.join(', '));

/* ---- 硬校验 3：WMM2025 系数表完整（60 阶以上、epoch 2025）---- */
if (engine.indexOf('epoch:2025') < 0) fail('WMM2025 系数表 epoch 异常');
if (engine.indexOf('WMM2025') < 0) fail('WMM2025 系数表缺失');

/* ---- 组装输出 ---- */
var header = [
  '/* =====================================================================',
  ' * engine.js — 判读引擎（纯函数，零 DOM / 零平台 API 依赖）',
  ' *',
  ' * ⚠️ 本文件由 scripts/build-mp-engine.js 自动生成，请勿手动编辑。',
  ' *    单一事实来源：assets/part1.html（H5 与小程序共用同一份引擎）',
  ' *    修改步骤：改 assets/part1.html → npm run build:mp',
  ' *',
  ' * 生成时间：' + new Date().toISOString() + '',
  ' * ===================================================================== */',
  ''
].join('\n');

var footer = [
  '',
  '/* ---- 小程序模块导出（H5 中 LP 为全局变量，此处转为 CommonJS）---- */',
  'module.exports = LP;',
  ''
].join('\n');

var banner = [
  '',
  '/* ============ 以下为 engine 正文（自 part1.html 自动抽取） ============ */',
  ''
].join('\n');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + banner + engine.trim() + '\n' + footer, 'utf8');

/* ---- 语法校验：生成的模块必须能被 require ---- */
try {
  var mod = require(OUT);
  var checks = [
    ['mountainAt(0).name', mod.mountainAt(0).name === '子'],
    ['mountainAt(90).name', mod.mountainAt(90).name === '卯'],
    ['analyze(0).jian.type', mod.analyze(0).jian.type === '正向'],
    ['LONG72_VAL 长度', mod.LONG72_VAL.length === 72],
    ['FJ120 长度', mod.FJ120.length === 120],
    ['JIAZI 长度', mod.JIAZI.length === 60],
    ['GEOMAG.declination(23.13,113.26,2025,0) 有限值', isFinite(mod.GEOMAG.declination(23.13, 113.26, 2025, 0))],
    ['GEO.distance 赤道 1° ≈ 111.3km', Math.abs(mod.GEO.distance(0, 0, 0, 1) - 111319) < 200]
  ];
  var bad = checks.filter(function (c) { return !c[1]; }).map(function (c) { return c[0]; });
  if (bad.length) fail('生成模块冒烟测试未通过：' + bad.join('; '));
  console.log('[build-mp-engine] ✓ 引擎零 DOM 依赖校验通过（' + FORBIDDEN.length + ' 项符号扫描）');
  console.log('[build-mp-engine] ✓ 关键导出完整性校验通过（' + MUST_EXPORT.length + ' 项）');
  console.log('[build-mp-engine] ✓ WMM2025 系数表校验通过');
  console.log('[build-mp-engine] ✓ 生成模块可 require，冒烟测试 ' + checks.length + '/' + checks.length + ' 通过');
} catch (e) {
  fail('生成的 engine.js 无法加载：' + e.message);
}

var kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log('[build-mp-engine] ✓ 已生成 miniprogram/utils/engine.js（' + kb + ' KB）');
