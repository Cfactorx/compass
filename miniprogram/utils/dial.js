/* =====================================================================
 * dial.js — 罗盘盘面绘制（Canvas 2D，移植自 H5 版 buildDial）
 *
 * 与 H5 版差异：
 *   - document.createElement('canvas') → wx.createOffscreenCanvas({type:'2d'})
 *   - 字体 '700 30px' → 'bold 30px'（小程序 Canvas 2D 对数字字重支持不稳定）
 *   - 保留 P2-8 离屏缓存：按 dialStyle|long72|long60 三维 key 缓存，
 *     设置切换命中缓存直接贴图，避免 ~150 环全量重算
 *
 * 环区半径（由外到内，全部与 H5 版一致）：
 *   度数环 [404,444] · 山环 [330,404] · 分金环 [278,330]
 *   穿山龙环 [244,278] · 透地龙环 [210,244] · 八卦环线 r198/卦名 r182 · 天池 r54
 * ===================================================================== */
'use strict';
var E = require('./engine.js');

var DIAL = 900;      /* 盘面逻辑尺寸（正方向 × 900） */
var DC = 450;        /* 圆心 */

var _cache = {};     /* key -> offscreen canvas */
var _cacheKey = null;

var FONT = 'sans-serif';

function createCanvas(w, h) {
  /* 基础库 2.7.0+ 支持 wx.createOffscreenCanvas；老版本返回 null 由调用方降级 */
  try {
    var c = wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
    return c;
  } catch (e) {
    return null;
  }
}

/* 设置指纹 → 缓存 key */
function keyOf(settings) {
  return (settings.dialStyle || 'modern') + '|' +
         (settings.showLong72 ? '1' : '0') + '|' +
         (settings.showLong60 ? '1' : '0');
}

/* 获取盘面 canvas（命中缓存直接返回） */
function getDial(settings) {
  var k = keyOf(settings);
  if (_cacheKey === k && _cache[k]) return _cache[k];
  var cv = createCanvas(DIAL, DIAL);
  if (!cv) return null;
  drawDial(cv, settings);
  _cache[k] = cv;
  _cacheKey = k;
  return cv;
}

function clearCache() { _cache = {}; _cacheKey = null; }

/* ---- 纳音五行 → 填色（与 H5 版同色系）---- */
function elementFill(el) {
  if (el === '金') return 'rgba(212,175,55,.16)';
  if (el === '木') return 'rgba(86,140,47,.16)';
  if (el === '水') return 'rgba(52,109,179,.16)';
  if (el === '火') return 'rgba(200,64,42,.16)';
  return 'rgba(139,90,43,.16)';
}

function drawDial(cv, settings) {
  var g = cv.getContext('2d');
  var classic = settings.dialStyle === 'classic';
  var c = DC, R = 444, PI2 = Math.PI * 2;
  var BASE = classic ? '#F3E5C8' : '#FDF6EC';
  var RIM = classic ? '#8A5A2B' : '#D96A1F';
  var RED = '#C2402A';

  g.clearRect(0, 0, DIAL, DIAL);
  g.fillStyle = BASE;
  g.beginPath(); g.arc(c, c, R, 0, PI2); g.fill();
  g.lineWidth = 6; g.strokeStyle = RIM;
  g.beginPath(); g.arc(c, c, R - 3, 0, PI2); g.stroke();

  /* ---- 山界细线 + 卦界红线 ---- */
  var k, b, rad, big;
  for (k = 0; k < 24; k++) {
    b = 7.5 + 15 * k; rad = b * Math.PI / 180;
    big = (b % 45) === 22.5;
    g.beginPath();
    g.moveTo(c + Math.sin(rad) * (R - 6), c - Math.cos(rad) * (R - 6));
    g.lineTo(c + Math.sin(rad) * 210, c - Math.cos(rad) * 210);
    if (big) { g.lineWidth = 3; g.strokeStyle = 'rgba(194,64,42,.85)'; }
    else { g.lineWidth = 1; g.strokeStyle = 'rgba(61,50,41,.22)'; }
    g.stroke();
  }

  /* ---- 透地六十龙环 [210,244]（可选）---- */
  if (settings.showLong60) {
    var r60o = 244, r60i = 210, l6, a06, a16;
    for (l6 = 0; l6 < 60; l6++) {
      var e6 = (E.JIAZI[l6].charAt(0) === '戊' || E.JIAZI[l6].charAt(0) === '己');
      g.fillStyle = e6 ? 'rgba(120,110,100,.22)' : elementFill(E.NAYIN[Math.floor(l6 / 2)][1]);
      a06 = (337.5 + l6 * 6) * Math.PI / 180;
      a16 = (337.5 + (l6 + 1) * 6) * Math.PI / 180;
      g.beginPath();
      g.arc(c, c, r60o, a06 - Math.PI / 2, a16 - Math.PI / 2);
      g.arc(c, c, r60i, a16 - Math.PI / 2, a06 - Math.PI / 2, true);
      g.closePath(); g.fill();
    }
    var d6, ad6;
    for (d6 = 0; d6 <= 60; d6++) {
      ad6 = (337.5 + d6 * 6) * Math.PI / 180;
      g.beginPath();
      g.moveTo(c + Math.sin(ad6) * r60i, c - Math.cos(ad6) * r60i);
      g.lineTo(c + Math.sin(ad6) * r60o, c - Math.cos(ad6) * r60o);
      g.lineWidth = 0.6; g.strokeStyle = 'rgba(61,50,41,.3)'; g.stroke();
    }
    g.font = 'bold 9px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    var t6, mid6, jz6, e6t, ci6;
    for (t6 = 0; t6 < 60; t6++) {
      mid6 = (337.5 + t6 * 6 + 3) * Math.PI / 180;
      jz6 = E.JIAZI[t6];
      e6t = (jz6.charAt(0) === '戊' || jz6.charAt(0) === '己');
      g.save(); g.translate(c, c); g.rotate(mid6); g.translate(0, -227);
      g.fillStyle = e6t ? 'rgba(150,140,130,.5)' : (classic ? '#6B4419' : '#3a3128');
      for (ci6 = 0; ci6 < 2; ci6++) {
        g.save(); g.translate(0, ci6 * 9); g.rotate(Math.PI); g.fillText(jz6[ci6], 0, 0); g.restore();
      }
      g.restore();
    }
    g.lineWidth = 1; g.strokeStyle = 'rgba(61,50,41,.3)';
    g.beginPath(); g.arc(c, c, r60o, 0, PI2); g.stroke();
    g.beginPath(); g.arc(c, c, r60i, 0, PI2); g.stroke();
  }

  /* ---- 穿山七十二龙环 [244,278]（可选）---- */
  if (settings.showLong72) {
    var r72o = 278, r72i = 244, l7, a07, a17;
    for (l7 = 0; l7 < 72; l7++) {
      var v7 = E.LONG72_VAL[l7];
      if (v7 === -1) g.fillStyle = 'rgba(120,110,100,.22)';
      else g.fillStyle = elementFill(E.NAYIN[Math.floor(v7 / 2)][1]);
      a07 = (337.5 + l7 * 5) * Math.PI / 180;
      a17 = (337.5 + (l7 + 1) * 5) * Math.PI / 180;
      g.beginPath();
      g.arc(c, c, r72o, a07 - Math.PI / 2, a17 - Math.PI / 2);
      g.arc(c, c, r72i, a17 - Math.PI / 2, a07 - Math.PI / 2, true);
      g.closePath(); g.fill();
    }
    var d7, ad7;
    for (d7 = 0; d7 <= 72; d7++) {
      ad7 = (337.5 + d7 * 5) * Math.PI / 180;
      g.beginPath();
      g.moveTo(c + Math.sin(ad7) * r72i, c - Math.cos(ad7) * r72i);
      g.lineTo(c + Math.sin(ad7) * r72o, c - Math.cos(ad7) * r72o);
      g.lineWidth = 0.5; g.strokeStyle = 'rgba(61,50,41,.28)'; g.stroke();
    }
    var sb, asb;
    for (sb = 0; sb < 24; sb++) {
      asb = (337.5 + sb * 15) * Math.PI / 180;
      g.beginPath();
      g.moveTo(c + Math.sin(asb) * r72i, c - Math.cos(asb) * r72i);
      g.lineTo(c + Math.sin(asb) * r72o, c - Math.cos(asb) * r72o);
      g.lineWidth = 1.2; g.strokeStyle = 'rgba(61,50,41,.42)'; g.stroke();
    }
    g.font = 'bold 8px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
    var t7, v7t, jz7, mid7;
    for (t7 = 0; t7 < 72; t7++) {
      v7t = E.LONG72_VAL[t7];
      if (v7t === -1) continue;
      jz7 = E.JIAZI[v7t]; mid7 = (337.5 + t7 * 5 + 2.5) * Math.PI / 180;
      g.save(); g.translate(c, c); g.rotate(mid7); g.translate(0, -261);
      g.fillStyle = classic ? '#6B4419' : '#3a3128';
      var ci7;
      for (ci7 = 0; ci7 < 2; ci7++) {
        g.save(); g.translate(0, ci7 * 8); g.rotate(Math.PI); g.fillText(jz7[ci7], 0, 0); g.restore();
      }
      g.restore();
    }
    g.lineWidth = 1; g.strokeStyle = 'rgba(61,50,41,.3)';
    g.beginPath(); g.arc(c, c, r72o, 0, PI2); g.stroke();
    g.beginPath(); g.arc(c, c, r72i, 0, PI2); g.stroke();
  }

  /* ---- 分金环 [278,330]：底色 + 分隔 + 干支 ---- */
  var rFjOut = 330, rFjIn = 278, i, j;
  g.save();
  g.beginPath(); g.arc(c, c, rFjOut, 0, PI2); g.clip();
  for (i = 0; i < 24; i++) {
    for (j = 0; j < 5; j++) {
      var cell = E.FJ120[i * 5 + j];
      var a0 = cell.startRaw * Math.PI / 180, a1 = cell.endRaw * Math.PI / 180;
      /* 中性化：主格/次格（原「旺/相」）填底色，骑线（原「空亡」）填灰 */
      if (cell.attr === '旺' || cell.attr === '相')
        g.fillStyle = classic ? 'rgba(196,138,50,.22)' : 'rgba(239,125,45,.16)';
      else if (cell.attr === '空亡') g.fillStyle = 'rgba(120,110,100,.12)';
      else g.fillStyle = 'rgba(120,110,100,.05)';
      g.beginPath(); g.moveTo(c, c);
      g.arc(c, c, rFjOut, a0 - Math.PI / 2, a1 - Math.PI / 2);
      g.closePath(); g.fill();
    }
  }
  g.restore();
  var i2, j2, dd, rd;
  for (i2 = 0; i2 < 24; i2++) {
    for (j2 = 0; j2 <= 5; j2++) {
      dd = i2 * 15 - 7.5 + j2 * 3; rd = dd * Math.PI / 180;
      g.beginPath();
      g.moveTo(c + Math.sin(rd) * rFjIn, c - Math.cos(rd) * rFjIn);
      g.lineTo(c + Math.sin(rd) * rFjOut, c - Math.cos(rd) * rFjOut);
      g.lineWidth = 0.7; g.strokeStyle = 'rgba(61,50,41,.25)'; g.stroke();
    }
  }
  g.lineWidth = 1; g.strokeStyle = 'rgba(61,50,41,.3)';
  g.beginPath(); g.arc(c, c, rFjOut, 0, PI2); g.stroke();
  g.beginPath(); g.arc(c, c, rFjIn, 0, PI2); g.stroke();
  var i3, j3, cel, mid, ci;
  for (i3 = 0; i3 < 24; i3++) {
    for (j3 = 0; j3 < 5; j3++) {
      cel = E.FJ120[i3 * 5 + j3];
      if (cel.attr !== '旺' && cel.attr !== '相') continue;
      mid = (cel.startRaw + 1.5) * Math.PI / 180;
      g.save();
      g.translate(c, c); g.rotate(mid);
      g.fillStyle = cel.attr === '旺' ? '#B4531F' : '#8A6A3A';
      g.font = 'bold 17px ' + FONT;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (ci = 0; ci < cel.ganZhi.length; ci++) {
        g.save(); g.translate(0, -(316 - ci * 20)); g.rotate(Math.PI);
        g.fillText(cel.ganZhi[ci], 0, 0);
        g.restore();
      }
      g.restore();
    }
  }

  /* ---- 二十四山环 [330,404] ---- */
  var m, name, midA, isZheng;
  for (m = 0; m < 24; m++) {
    name = E.MOUNTAINS[m]; midA = m * 15 * Math.PI / 180;
    isZheng = (name === '子' || name === '午' || name === '卯' || name === '酉');
    g.save();
    g.translate(c, c); g.rotate(midA); g.translate(0, -367); g.rotate(Math.PI);
    g.fillStyle = isZheng ? RED : (classic ? '#6B4419' : '#4A3B2E');
    g.font = (isZheng ? 'bold 34px ' : 'bold 30px ') + FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(name, 0, 0);
    g.restore();
  }
  g.lineWidth = 1; g.strokeStyle = 'rgba(61,50,41,.3)';
  g.beginPath(); g.arc(c, c, 330, 0, PI2); g.stroke();
  g.beginPath(); g.arc(c, c, 404, 0, PI2); g.stroke();

  /* ---- 度数环 [404,444] ---- */
  g.fillStyle = classic ? '#EFE0C0' : '#FBF0E2';
  g.beginPath(); g.arc(c, c, R - 6, 0, PI2); g.arc(c, c, 404, 0, PI2, true); g.fill();
  var t, rt, len;
  for (t = 0; t < 360; t += 2) {
    rt = t * Math.PI / 180;
    len = (t % 10 === 0) ? 14 : 7;
    g.beginPath();
    g.moveTo(c + Math.sin(rt) * (R - 8), c - Math.cos(rt) * (R - 8));
    g.lineTo(c + Math.sin(rt) * (R - 8 - len), c - Math.cos(rt) * (R - 8 - len));
    g.lineWidth = (t % 30 === 0) ? 2.2 : 1;
    g.strokeStyle = (t % 30 === 0) ? '#8A5A2B' : 'rgba(61,50,41,.45)';
    g.stroke();
  }
  g.fillStyle = '#7A5B33';
  g.font = 'bold 20px ' + FONT;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  var t2;
  for (t2 = 0; t2 < 360; t2 += 30) {
    g.save();
    g.translate(c, c); g.rotate(t2 * Math.PI / 180); g.translate(0, -(R - 33));
    g.fillText(String(t2), 0, 0);
    g.restore();
  }

  /* ---- 八卦环 ---- */
  var guaByAngle = { 0: '坎', 45: '艮', 90: '震', 135: '巽', 180: '离', 225: '坤', 270: '兑', 315: '乾' };
  for (var ga in guaByAngle) {
    var ang = parseInt(ga, 10) * Math.PI / 180;
    g.save();
    g.translate(c, c); g.rotate(ang); g.translate(0, -182);
    g.fillStyle = '#C05A20';
    g.font = 'bold 22px ' + FONT;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(guaByAngle[ga], 0, 0);
    g.restore();
  }
  g.lineWidth = 1; g.strokeStyle = 'rgba(194,64,42,.35)';
  g.beginPath(); g.arc(c, c, 198, 0, PI2); g.stroke();

  /* ---- 内圈 + 天池 ---- */
  g.lineWidth = 2; g.strokeStyle = RIM;
  g.beginPath(); g.arc(c, c, 210, 0, PI2); g.stroke();
  g.fillStyle = classic ? '#F7EBD2' : '#FFFDF8';
  g.beginPath(); g.arc(c, c, 54, 0, PI2); g.fill();
  g.lineWidth = 2.5; g.strokeStyle = RED;
  g.beginPath(); g.arc(c, c, 54, 0, PI2); g.stroke();
}

/* =====================================================================
 * 主盘面合成：盘面旋转 + 当前分金格高亮 + 磁针 + 天心十字
 *   ctx      : 页面 canvas 2d context（已按 dpr 缩放）
 *   W        : 逻辑边长（px）
 *   heading  : 平滑后的方位角（度）
 *   cardDeg  : 当前判读向方度数（null = 不高亮）
 *   settings : 设置对象
 * ===================================================================== */
function drawCompass(ctx, W, heading, cardDeg, settings) {
  var dial = getDial(settings);
  if (!ctx || !dial) return false;
  var c2 = W / 2, scale = W / DIAL;
  var PI2 = Math.PI * 2;
  var rot = E.mapSensorToDial(heading) * Math.PI / 180;

  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.translate(c2, c2); ctx.rotate(rot);
  ctx.drawImage(dial, -c2, -c2, W, W);

  /* 坐方分金格高亮（红框） */
  if (cardDeg != null) {
    var sit = E.norm(cardDeg + 180);
    var cell = E.fenjinAt(sit, settings.fenjinMode);
    var a0 = (cell.start - 0.2) * Math.PI / 180, a1 = (cell.end + 0.2) * Math.PI / 180;
    ctx.save();
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(Math.sin(a0) * 278, -Math.cos(a0) * 278);
    ctx.arc(0, 0, 278, a0 - Math.PI / 2, a1 - Math.PI / 2);
    ctx.lineTo(Math.sin(a1) * 330, -Math.cos(a1) * 330);
    ctx.arc(0, 0, 330, a1 - Math.PI / 2, a0 - Math.PI / 2, true);
    ctx.closePath();
    ctx.lineWidth = 3.5; ctx.strokeStyle = '#C2402A'; ctx.stroke();
    ctx.restore();
  }

  /* 磁针（随盘转动） */
  ctx.save(); ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(0, 44); ctx.lineTo(6, 0); ctx.lineTo(0, -46); ctx.lineTo(-6, 0); ctx.closePath();
  ctx.fillStyle = '#D0342C'; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 44); ctx.lineTo(6, 0); ctx.lineTo(0, 8); ctx.lineTo(-6, 0); ctx.closePath();
  ctx.fillStyle = '#9A8F84'; ctx.fill();
  ctx.restore();
  ctx.restore();

  /* 中心点 */
  ctx.beginPath(); ctx.arc(c2, c2, 3.5, 0, PI2); ctx.fillStyle = '#C2402A'; ctx.fill();

  /* 固定十字天心（指示手机顶部朝向） */
  ctx.strokeStyle = '#EF7D2D'; ctx.lineWidth = Math.max(2, 3 * scale);
  ctx.beginPath(); ctx.moveTo(c2, 6); ctx.lineTo(c2, c2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(c2 - 14, 6); ctx.lineTo(c2, 20); ctx.lineTo(c2 + 14, 6);
  ctx.closePath(); ctx.fillStyle = '#EF7D2D'; ctx.fill();
  return true;
}

module.exports = {
  DIAL: DIAL,
  getDial: getDial,
  drawDial: drawDial,
  drawCompass: drawCompass,
  clearCache: clearCache
};
