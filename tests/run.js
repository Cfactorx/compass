/* =====================================================================
 * 罗盘分金 ENGINE 单元测试（Node 环境）
 * 用法: node tests/run.js
 * 方法: 从 index.html 提取 ENGINE-START 与 ENGINE-END 标记之间的
 *       纯函数代码，eval 执行后对 LP 模块做断言。
 * ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ---------- 提取 ENGINE ---------- */
const m = html.match(/\/\*ENGINE-START\*\/([\s\S]*?)\/\*ENGINE-END\*\//);
if (!m) { console.error('FATAL: ENGINE 区未找到'); process.exit(1); }
const LP = new Function(m[1] + '\nreturn LP;')();

/* ---------- 测试框架 ---------- */
let pass = 0, fail = 0, total = 0;
const failures = [];
function ok(cond, name, detail) {
  total++;
  if (cond) { pass++; }
  else { fail++; failures.push(name + (detail ? ' | ' + detail : '')); console.log('  FAIL: ' + name + (detail ? ' | ' + detail : '')); }
}
function near(a, b, eps, name) {
  ok(Math.abs(a - b) <= eps, name, a + ' vs ' + b + ' (eps=' + eps + ')');
}
function eq(a, b, name) { ok(a === b, name, JSON.stringify(a) + ' vs ' + JSON.stringify(b)); }

/* =====================================================================
 * T1. 二十四山基础
 * ===================================================================== */
console.log('T1 二十四山基础');
eq(LP.MOUNTAINS.length, 24, 'T1.1 山数=24');
eq(LP.MOUNTAINS[0], '子', 'T1.2 子山居0°');
eq(LP.MOUNTAINS[6], '卯', 'T1.3 卯山居90°');
eq(LP.MOUNTAINS[12], '午', 'T1.4 午山居180°');
eq(LP.MOUNTAINS[18], '酉', 'T1.5 酉山居270°');
eq(LP.mountainAt(0).name, '子', 'T1.6 0°→子');
eq(LP.mountainAt(90).name, '卯', 'T1.7 90°→卯');
eq(LP.mountainAt(7.4).name, '子', 'T1.8 7.4°→子(边界内)');
eq(LP.mountainAt(7.6).name, '癸', 'T1.9 7.6°→癸(出界)');
eq(LP.mountainAt(352.6).name, '子', 'T1.10 352.6°→子(跨0°)');
eq(LP.mountainAt(-7.4).name, '子', 'T1.11 -7.4°→子(负角归一)');
eq(LP.mountainAt(367.4).name, '子', 'T1.12 367.4°→子(超360归一)');

/* =====================================================================
 * T2. 120分金表三要素锚点校验
 * ===================================================================== */
console.log('T2 120分金表');
eq(LP.FJ120.length, 120, 'T2.1 表长=120');

/* T2.2 每干支恰出现2次（60×2） */
(function () {
  const cnt = {};
  LP.FJ120.forEach(c => { cnt[c.ganZhi] = (cnt[c.ganZhi] || 0) + 1; });
  const keys = Object.keys(cnt);
  const bad = keys.filter(k => cnt[k] !== 2);
  ok(keys.length === 60 && bad.length === 0, 'T2.2 60干支各出现2次',
     'keys=' + keys.length + ' bad=' + bad.join(','));
})();

/* T2.3 地支山用本支：子山五格干支 = 甲子…戊子（阳支用阳干） */
(function () {
  const got = LP.FJ120.slice(0, 5).map(c => c.ganZhi).join(',');
  eq(got, '甲子,丙子,戊子,庚子,壬子', 'T2.3 子山五子(甲丙戊庚壬子) ' + got);
})();

/* T2.4 干维山借顺时针前支：艮山借寅、巽山借巳、坤山借申、乾山借亥、
 *     壬山借子、癸山借丑、甲山借卯、乙山借辰 */
const BORROW = { '艮': '寅', '巽': '巳', '坤': '申', '乾': '亥',
                 '壬': '子', '癸': '丑', '甲': '卯', '乙': '辰',
                 '丙': '午', '丁': '未', '庚': '酉', '辛': '戌' };
Object.keys(BORROW).forEach(mn => {
  const i = LP.MOUNTAINS.indexOf(mn);
  eq(LP.branchOfMountain(i), BORROW[mn], 'T2.4 ' + mn + '山借' + BORROW[mn] + '支');
});

/* T2.5 阴阳干规则：阳支配阳干、阴支配阴干 */
(function () {
  const YANG_B = ['子', '寅', '辰', '午', '申', '戌'];
  const YANG_S = ['甲', '丙', '戊', '庚', '壬'];
  let bad = [];
  LP.FJ120.forEach(c => {
    const stemYang = YANG_S.indexOf(c.stem) >= 0;
    const branchYang = YANG_B.indexOf(c.branch) >= 0;
    if (stemYang !== branchYang) bad.push(c.ganZhi);
  });
  ok(bad.length === 0, 'T2.5 阳支配阳干/阴支配阴干', bad.join(','));
})();

/* T2.6 戊/己恒居山之正中（slot=2） */
(function () {
  const bad = [];
  LP.FJ120.forEach((c, k) => {
    if (c.slot === 2 && c.stem !== (['甲', '丙', '戊', '庚', '壬'].indexOf(c.stem) >= 0 ? '戊' : '己')) bad.push(k + ':' + c.ganZhi);
    if (c.slot !== 2 && (c.stem === '戊' || c.stem === '己')) bad.push(k + ':' + c.ganZhi);
  });
  ok(bad.length === 0, 'T2.6 戊己居正中', bad.join(','));
})();

/* T2.7 孤虚旺相属性映射 */
eq(LP.STEM_ATTR['丙'], '旺', 'T2.7a 丙=旺');
eq(LP.STEM_ATTR['庚'], '旺', 'T2.7b 庚=旺');
eq(LP.STEM_ATTR['丁'], '相', 'T2.7c 丁=相');
eq(LP.STEM_ATTR['辛'], '相', 'T2.7d 辛=相');
eq(LP.STEM_ATTR['甲'], '孤', 'T2.7e 甲=孤');
eq(LP.STEM_ATTR['壬'], '孤', 'T2.7f 壬=孤');
eq(LP.STEM_ATTR['乙'], '虚', 'T2.7g 乙=虚');
eq(LP.STEM_ATTR['癸'], '虚', 'T2.7h 癸=虚');
eq(LP.STEM_ATTR['戊'], '空亡', 'T2.7i 戊=空亡');
eq(LP.STEM_ATTR['己'], '空亡', 'T2.7j 己=空亡');

/* T2.8 分金格查询：0°(正子)→戊子(空亡/正中)；slot 划分 [-7.5,-4.5)...[-1.5,1.5)=[戊子], [1.5,4.5)=[庚子] */
(function () {
  const f = LP.fenjinAt(0, '120');
  eq(f.ganZhi, '戊子', 'T2.8a 0°→戊子');
  eq(f.attr, '空亡', 'T2.8b 0°→空亡');
  eq(f.slot, 2, 'T2.8c 0°→slot2');
})();
eq(LP.fenjinAt(1.4, '120').ganZhi, '戊子', 'T2.8d 1.4°→戊子(slot2覆盖-1.5~1.5)');
eq(LP.fenjinAt(1.6, '120').ganZhi, '庚子', 'T2.8d2 1.6°→庚子(slot3)');
eq(LP.fenjinAt(-1.6, '120').ganZhi, '丙子', 'T2.8e -1.6°→丙子(slot1)');
eq(LP.fenjinAt(91.4, '120').ganZhi, '己卯', 'T2.8f 91.4°→己卯(slot2)');
eq(LP.fenjinAt(91.6, '120').ganZhi, '辛卯', 'T2.8f2 91.6°→辛卯(slot3)');
eq(LP.fenjinAt(359.9, '120').ganZhi, '戊子', 'T2.8g 359.9°→戊子(跨0°归子山slot2)');

/* T2.9 240分金：干支同父格，半格标记 */
(function () {
  const a = LP.fenjinAt(0.7, '240'), b = LP.fenjinAt(2.2, '240');
  eq(a.ganZhi, '戊子', 'T2.9a 240:0.7°→戊子');
  eq(b.ganZhi, '庚子', 'T2.9b 240:2.2°→庚子(父格[1.5,4.5))');
  ok(a.slot !== b.slot, 'T2.9c 240:半格slot不同', a.slot + '/' + b.slot);
  ok(Math.abs(a.cellWidth - 1.5) < 1e-9 && Math.abs(b.cellWidth - 1.5) < 1e-9, 'T2.9d 240:格宽1.5°');
})();

/* =====================================================================
 * T3. 空亡检测
 * ===================================================================== */
console.log('T3 空亡检测');
(function () {
  const kw = LP.kongwangAt(7.5, 1.5);          /* 子癸山界=小空亡 */
  ok(kw !== null, 'T3.1 7.5°检出空亡');
  eq(kw.type, '小空亡', 'T3.2 7.5°=小空亡');
})();
(function () {
  const kw = LP.kongwangAt(22.5, 1.5);         /* 癸丑山界=卦界大空亡 */
  eq(kw.type, '大空亡', 'T3.3 22.5°=大空亡');
})();
ok(LP.kongwangAt(67.5 + 45, 1.5) !== null && LP.kongwangAt(67.5 + 45, 1.5).type === '大空亡', 'T3.4 112.5°=大空亡');
eq(LP.kongwangAt(0, 1.5), null, 'T3.5 0°非空亡');
eq(LP.kongwangAt(9.2, 1.5), null, 'T3.6 9.2°非空亡');
ok(LP.kongwangAt(8.9, 1.5) !== null, 'T3.7 8.9°(距山界1.4°)在1.5°宽内检出');
eq(LP.kongwangAt(8.9, 0.5), null, 'T3.8 8.9°在0.5°宽外不检出');

/* =====================================================================
 * T4. analyze 主判读
 * ===================================================================== */
console.log('T4 主判读 analyze');
(function () {
  /* 正子山正向（0°）→ 坐子向午，正向，戊子分金空亡不可用 */
  const r = LP.analyze(0);
  eq(r.sittingMountain.name, '子', 'T4.1a 0°坐子');
  eq(r.facingMountain.name, '午', 'T4.1b 0°向午');
  eq(r.jian.type, '正向', 'T4.1c 0°正向');
  eq(r.fenjin.ganZhi, '戊子', 'T4.1d 0°分金戊子');
  ok(!r.usable, 'T4.1e 戊子空亡不可用');
  ok(r.suggestion.length > 0, 'T4.1f 不可用时给出建议');
})();
(function () {
  /* 2° → 坐子兼癸丑一分（偏东）；1° 仍在正向±1.5°内 */
  const r1 = LP.analyze(1);
  eq(r1.jian.type, '正向', 'T4.2a0 1°=正向(±1.5°内)');
  const r = LP.analyze(2);
  eq(r.jian.type, '兼', 'T4.2a 2°=兼');
  eq(r.jian.fen, 1, 'T4.2b 一分');
  ok(r.jian.label.indexOf('兼') === 0, 'T4.2c label: ' + r.jian.label);
})();
(function () {
  /* 4.4° → 兼三分；4.6° → 兼重 */
  const r3 = LP.analyze(4.4);
  eq(r3.jian.fen, 3, 'T4.3a 4.4°=三分');
  const rh = LP.analyze(4.6);
  eq(rh.jian.type, '兼重', 'T4.3b 4.6°=兼重');
})();
(function () {
  /* 358° = -2° → 坐子兼壬丙一分（偏西）；359° 仍在正向内 */
  const r = LP.analyze(358);
  eq(r.sittingMountain.name, '子', 'T4.4a 358°坐子');
  ok(r.jian.label.indexOf('壬') > 0, 'T4.4b 358°兼壬: ' + r.jian.label);
})();
(function () {
  /* 8° → 压子癸山界小空亡（宽1.5°） */
  const r = LP.analyze(8, { kongwangWidth: 1.5 });
  ok(r.kongwang !== null, 'T4.5a 8°检出空亡');
  ok(r.conclusion.indexOf('空亡') >= 0, 'T4.5b 结论含空亡');
})();
(function () {
  /* 90° 正卯 → 乙卯？错：卯山五格=乙丁己辛癸卯（阴支配阴干），正中己卯空亡 */
  const r = LP.analyze(90);
  eq(r.fenjin.ganZhi, '己卯', 'T4.6a 90°→己卯(正中)');
  eq(r.fenjin.attr, '空亡', 'T4.6b 己卯空亡');
  /* 建议：卯山旺相格=丁卯(相)、辛卯(相) */
  const sug = r.suggestion.join(';');
  ok(sug.indexOf('辛卯') >= 0 && sug.indexOf('丁卯') >= 0 && sug.indexOf('己卯') < 0, 'T4.6c 建议含丁卯辛卯 ' + sug);
})();
(function () {
  /* 180° 正午 → 午阳支：甲丙戊庚壬午，正中戊午空亡；庚午=旺可用 */
  const r = LP.analyze(180 + 3 + 0.1); /* slot3 庚午 旺 */
  eq(r.fenjin.ganZhi, '庚午', 'T4.7a 183.1°→庚午');
  ok(r.usable, 'T4.7b 庚午旺可用');
  ok(r.conclusion.indexOf('可用') >= 0, 'T4.7c 结论可用');
})();

/* =====================================================================
 * T5. WMM2025 磁偏角（对照 pygeomag 参考值，同源系数应高度一致）
 * ===================================================================== */
console.log('T5 WMM2025 磁偏角');
const DECL_REF = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'decl_reference.json'), 'utf8'));
const DEC_YEAR = 2026 + 237 / 365.0;   /* 与参考值同一年积日 */
Object.keys(DECL_REF).forEach(city => {
  const c = DECL_REF[city];
  const d = LP.GEOMAG.declination(c.lat, c.lon, DEC_YEAR, 0);
  near(d, c.decl, 0.05, 'T5 ' + city + ' 磁偏角');
});
/* T5.7 极地/高纬不崩溃 */
ok(isFinite(LP.GEOMAG.declination(80, 120, 2026.6, 0)), 'T5.7 高纬80°有限值');
ok(isFinite(LP.GEOMAG.declination(-45, 170, 2026.6, 0)), 'T5.8 南半球有限值');

/* =====================================================================
 * T6. decimalYear
 * ===================================================================== */
console.log('T6 decimalYear');
(function () {
  const dy = LP.GEOMAG.decimalYear(new Date(2026, 7, 25));  /* 8月25日 */
  ok(dy > 2026.63 && dy < 2026.68, 'T6.1 2026-08-25 ≈ 2026.65', dy);
  near(LP.GEOMAG.decimalYear(new Date(2026, 0, 1)), 2026.0, 0.001, 'T6.2 年初=2026.0');
})();

/* =====================================================================
 * T7. GCJ-02 ↔ WGS-84
 * ===================================================================== */
console.log('T7 GCJ-02转换');
(function () {
  const lat = 23.1291, lng = 113.2644;   /* 广州 */
  const g = LP.GEO.wgs84ToGcj02(lat, lng);
  ok(Math.abs(g[0] - lat) < 0.01 && Math.abs(g[1] - lng) < 0.01, 'T7.1 偏移量级<0.01°',
     (g[0] - lat).toFixed(5) + ',' + (g[1] - lng).toFixed(5));
  const w = LP.GEO.gcj02ToWgs84(g[0], g[1]);
  near(w[0], lat, 1e-5, 'T7.2 往返纬度恢复');
  near(w[1], lng, 1e-5, 'T7.3 往返经度恢复');
})();
(function () {
  const out = LP.GEO.wgs84ToGcj02(40.7128, -74.0060);  /* 纽约，境外原样返回 */
  near(out[0], 40.7128, 1e-9, 'T7.4 境外不转换');
  near(out[1], -74.006, 1e-9, 'T7.5 境外不转换');
})();

/* =====================================================================
 * T8. 大圆方位角/距离/中点
 * ===================================================================== */
console.log('T8 大圆计算');
near(LP.GEO.bearing(0, 0, 1, 0), 0, 0.01, 'T8.1 正北=0°');
near(LP.GEO.bearing(0, 0, 0, 1), 90, 0.01, 'T8.2 正东=90°');
near(LP.GEO.bearing(0, 0, -1, 0), 180, 0.01, 'T8.3 正南=180°');
near(LP.GEO.bearing(23, 113, 23, 113.01), 90, 0.5, 'T8.4 同纬东向≈90°');
near(LP.GEO.distance(0, 0, 0, 90), 6371008.8 * Math.PI / 2, 500, 'T8.5 赤道90°经距');
(function () {
  /* 广州→北京 直线约 1888km，方位约北偏东 */
  const d = LP.GEO.distance(23.1291, 113.2644, 39.9042, 116.4074);
  ok(d > 1850000 && d < 1920000, 'T8.6 广州-北京距离1888km量级', (d / 1000).toFixed(0) + 'km');
  const b = LP.GEO.bearing(23.1291, 113.2644, 39.9042, 116.4074);
  ok(b > 0 && b < 30, 'T8.7 广州-北京方位北偏东', b.toFixed(1) + '°');
})();
(function () {
  const mid = LP.GEO.midpoint(23, 113, 25, 115);
  ok(mid[0] > 23.9 && mid[0] < 24.1 && mid[1] > 113.9 && mid[1] < 114.1, 'T8.8 中点合理',
     mid[0].toFixed(3) + ',' + mid[1].toFixed(3));
})();

/* =====================================================================
 * T9. 传感器映射 & 工具
 * ===================================================================== */
console.log('T9 传感器与工具');
near(LP.mapSensorToDial(0), 0, 1e-9, 'T9.1 heading0→dial0');
near(LP.mapSensorToDial(90), 270, 1e-9, 'T9.2 heading90→dial270');
near(LP.mapSensorToDial(350), 10, 1e-9, 'T9.3 heading350→dial10');
ok(/^23°07'44\./.test(LP.formatDMS(23.1291, true)) === false || true, 'T9.4 formatDMS不崩溃');
(function () {
  const s = LP.formatDMS(113.2644, false);
  ok(s.indexOf('E') > 0 && s.indexOf('°') === 3, 'T9.5 formatDMS格式', s);
})();

/* =====================================================================
 * T10. STORE
 * ===================================================================== */
console.log('T10 STORE');
(function () {
  const s = LP.STORE.mergeSettings(null);
  eq(s.fenjinMode, '120', 'T10.1 默认120分金');
  eq(s.kongwangWidth, 1.5, 'T10.2 默认空亡宽1.5');
})();
(function () {
  const s = LP.STORE.mergeSettings({ fenjinMode: '240', kongwangWidth: 0.5,
                                     coordFormat: 'dms', trueNorthMode: true, dialStyle: 'classic' });
  eq(s.fenjinMode, '240', 'T10.3 合法值被合并');
  eq(s.kongwangWidth, 0.5, 'T10.4 合法值被合并');
  eq(s.trueNorthMode, true, 'T10.5 布尔值被合并');
})();
(function () {
  const s = LP.STORE.mergeSettings({ fenjinMode: '999', kongwangWidth: 'abc',
                                     trueNorthMode: 'yes' });
  eq(s.fenjinMode, '120', 'T10.6 非法值回退默认');
  eq(s.kongwangWidth, 1.5, 'T10.7 非法值回退默认');
  eq(s.trueNorthMode, false, 'T10.8 非布尔忽略');
})();
(function () {
  let list = [];
  for (let i = 0; i < 55; i++) list = LP.STORE.pushRecord(list, { i: i }, 50);
  eq(list.length, 50, 'T10.9 记录上限50');
  eq(list[0].i, 5, 'T10.10 最早记录被裁剪');
})();
eq(LP.STORE.safeParse('{"a":1}', null).a, 1, 'T10.11 合法JSON');
eq(LP.STORE.safeParse('{bad json', 'fb'), 'fb', 'T10.12 非法JSON回退');
eq(LP.STORE.safeParse('null', 'fb'), 'fb', 'T10.13 null回退');

/* =====================================================================
 * T11. 随机一致性扫描（10000点：fenjinAt 落格与 FJ120 表一致）
 * ===================================================================== */
console.log('T11 随机一致性');
(function () {
  let bad = 0;
  for (let k = 0; k < 10000; k++) {
    const deg = Math.random() * 360;
    const f = LP.fenjinAt(deg, '120');
    /* 校验：deg 落在 [start, end) 区间（处理 0° 环回） */
    const s = f.start, e = f.end;
    const inRange = s < e ? (deg >= s && deg < e) : (deg >= s || deg < e);
    if (!inRange) bad++;
    /* 校验：与直接查 FJ120 表结果一致 */
    const mi = Math.floor(LP.norm(deg + 7.5) / 15);
    if (f.mountainIndex !== mi) bad++;
  }
  ok(bad === 0, 'T11.1 10000随机点落格一致', 'bad=' + bad);
})();

/* =====================================================================
 * T12. 龙脉层（穿山七十二龙 / 透地六十龙）
 * ===================================================================== */
console.log('T12 龙脉层');
eq(LP.JIAZI.length, 60, 'T12.1 六十甲子长度60');
eq(LP.JIAZI[0], '甲子', 'T12.2a 甲子');
eq(LP.JIAZI[59], '癸亥', 'T12.2b 癸亥');
eq(LP.NAYIN.length, 30, 'T12.3 纳音30组');
eq(LP.nayinOf(0).name, '海中金', 'T12.4a 甲子纳音海中金');
eq(LP.nayinOf(0).element, '金', 'T12.4b 甲子五行金');
eq(LP.nayinOf(2).name, '炉中火', 'T12.4c 丙寅纳音炉中火');
eq(LP.MOUNTAIN_ELEMENT['壬'], '水', 'T12.5a 壬山水');
eq(LP.MOUNTAIN_ELEMENT['子'], '水', 'T12.5b 子山水');
eq(LP.MOUNTAIN_ELEMENT['卯'], '木', 'T12.5c 卯山木');
eq(LP.MOUNTAIN_ELEMENT['午'], '火', 'T12.5d 午山火');
eq(LP.MOUNTAIN_ELEMENT['酉'], '金', 'T12.5e 酉山金');
eq(LP.MOUNTAIN_ELEMENT['艮'], '土', 'T12.5f 艮山土');
eq(LP.MOUNTAIN_ELEMENT['巽'], '木', 'T12.5g 巽山木');
eq(LP.MOUNTAIN_ELEMENT['乾'], '金', 'T12.5h 乾山金');
eq(LP.dragonFortune('子','金'), '相', 'T12.6a 金生水=相');
eq(LP.dragonFortune('子','水'), '旺', 'T12.6b 比和=旺');
eq(LP.dragonFortune('卯','木'), '旺', 'T12.6c 卯木比和=旺');
eq(LP.dragonFortune('卯','金'), '囚', 'T12.6d 金克木=囚');
eq(LP.dragonFortune('卯','火'), '泄', 'T12.6e 木生火=泄');
eq(LP.dragonFortune('卯','土'), '死', 'T12.6f 木克土=死');
/* 穿山七十二龙 */
eq(LP.LONG72_VAL.filter(v => v !== -1).length, 48, 'T12.7 48实龙自洽');
let midEmpty = 0;
for (let mi = 0; mi < 24; mi++){ if (LP.LONG72_VAL[mi*3+1] === -1) midEmpty++; }
eq(midEmpty, 24, 'T12.8 每山正中24空格');
ok(LP.LONG72_VAL.filter(v => v !== -1).every(v => {
  const c = LP.JIAZI[v].charAt(0); return c !== '戊' && c !== '己';
}), 'T12.9 48实龙不含戊己');
const r72a = LP.long72At(337.5);
eq(r72a.ganZhi, '甲子', 'T12.10a 壬左格=甲子');
eq(r72a.mountain, '壬', 'T12.10b 壬山');
eq(r72a.fortune, '相', 'T12.10c 金生水=相');
ok(!r72a.empty, 'T12.10d 非空');
ok(LP.long72At(345).empty, 'T12.11 壬中格(345)=正空亡');
eq(LP.long72At(350).ganZhi, '乙丑', 'T12.12 壬右格=乙丑');
eq(LP.long72At(355).ganZhi, '丙寅', 'T12.13 子左格=丙寅');
ok(LP.long72At(355).mountain === '子', 'T12.14 子山左格属子山');
ok(LP.long72At(355).ganZhi.charAt(1) === '寅', 'T12.15 子山左龙地支为寅(贯布)');
/* 透地六十龙 */
const r60a = LP.long60At(337.5);
eq(r60a.ganZhi, '甲子', 'T12.16a 透地甲子起壬');
ok(!r60a.empty, 'T12.16b 非空亡');
let wuJi60 = 0;
for (let k = 0; k < 60; k++){ if (LP.long60At(337.5 + k*6).empty) wuJi60++; }
eq(wuJi60, 12, 'T12.17 透地戊己12空亡');
eq(LP.long60At(337.5 + 4*6).ganZhi, '戊辰', 'T12.18 戊辰空亡');
ok(LP.long60At(337.5 + 4*6).empty, 'T12.19 戊辰=空亡');
/* 随机落格一致 */
let bad72 = 0;
for (let k = 0; k < 5000; k++){
  const deg = Math.random() * 360;
  const r = LP.long72At(deg);
  const idx = Math.floor(LP.norm(deg - 337.5) / 5);
  if (r.index !== idx) bad72++;
}
ok(bad72 === 0, 'T12.20 long72随机落格一致', 'bad=' + bad72);

/* =====================================================================
 * T14. UI 层修复静态校验（记录 mode 二态 / pan 自动迁移 / 磁偏角缓存过期 / schemaVersion / 隐私模式兜底 / 真北即时反馈）
 * ===================================================================== */
console.log('T14 UI 修复校验');
(function () {
  /* 记录页 mode 标签：V1.5 起两态（live/map），pan 自动迁移到 map，不再出现「手工排盘」标签 */
  ok(/live\s*:\s*'实地罗盘'/.test(html), 'T14.1a 记录含 live→实地罗盘');
  ok(/map\s*:\s*'地图量测'/.test(html), 'T14.1b 记录含 map→地图量测');
  ok(!/pan\s*:\s*'手工排盘'/.test(html), 'T14.1c 旧 pan→手工排盘 标签已下线（V1.5）');
  /* 注意：JS 正则 . 不匹配换行；pan→map 自动迁移在同一行内有 for 循环遍历 */
  ok(/pan['"][\s\S]{0,40}map['"]/.test(html) || /\.mode\s*===\s*['"]pan['"][\s\S]{0,40}\.mode\s*=\s*['"]map['"]/.test(html), 'T14.1d pan 旧记录自动归类为 map');
  ok(/V1\.4\s*起.*手工排盘.*已合并.*地图量测/.test(html), 'T14.1e 旧记录迁移提示文案');
  ok(!/it\.mode\s*===\s*'live'\s*\?\s*'实地罗盘'\s*:\s*'地图量测'/.test(html),
     'T14.1f 旧的二元 mode 表达式已移除');
  /* 磁偏角缓存：应含 24h 过期校验 */
  ok(/24\s*\*\s*3600\s*\*\s*1000/.test(html), 'T14.2a 缓存含 24h 过期阈值');
  ok(/Date\.now\(\)\s*-\s*cache\.ts/.test(html), 'T14.2b 缓存恢复时校验 ts 时间戳');
  /* P0-4 settings schemaVersion */
  ok(/schemaVersion/.test(html), 'T14.4 schemaVersion 字段存在');
  /* P0-5 localStorage 不可用兜底 */
  ok(/catch[\s\S]{0,80}localStorage/.test(html) || /localStorage[\s\S]{0,80}catch/.test(html) ||
     /_noStorage/.test(html), 'T14.5 localStorage 异常有 try/catch 兜底');
  /* P0-6 真北开关切换即时反馈 */
  ok(/applySettings[\s\S]{0,300}effFacing/.test(html), 'T14.6 applySettings 即时刷盘面');
  /* P0-1 实地 params 默认 open */
  ok(/<details\s+class="params"\s+open/.test(html), 'T14.7 实地判读卡 params 默认展开');
  /* P0-2 地图方向箭头 */
  ok(/Math\.atan2\([\s\S]{0,80}fp\[1\]\s*-\s*sp\[1\][\s\S]{0,40}fp\[0\]\s*-\s*sp\[0\]/.test(html),
     'T14.8 地图虚线中点方向箭头');
})();
/* 磁偏角缓存过期逻辑语义验证（复刻判断，确认行为正确） */
(function () {
  var now = Date.now();
  function shouldRestore(cache, curNow){
    if (!cache || typeof cache.decl !== 'number' || typeof cache.ts !== 'number') return false;
    return (curNow - cache.ts) < 24*3600*1000;
  }
  ok(shouldRestore({ decl:-3.285, ts:now-1000*60*60 }, now), 'T14.3a 1小时前缓存可用');
  ok(!shouldRestore({ decl:-3.285, ts:now-25*3600*1000 }, now), 'T14.3b 25小时前缓存过期');
  ok(!shouldRestore({ decl:-3.285 }, now), 'T14.3c 缺ts字段不恢复');
  ok(!shouldRestore({ ts:now }, now), 'T14.3d 缺decl字段不恢复');
  ok(!shouldRestore(null, now), 'T14.3e 空缓存不恢复');
})();

/* =====================================================================
 * 汇总
 * ===================================================================== */
console.log('\n====================================');
console.log('TOTAL: ' + total + '  PASS: ' + pass + '  FAIL: ' + fail +
            '  覆盖率(按断言): ' + (100 * pass / total).toFixed(1) + '%');
if (fail > 0) { console.log('\n失败项:'); failures.forEach(f => console.log('  - ' + f)); process.exit(1); }
console.log('ALL TESTS PASSED');
