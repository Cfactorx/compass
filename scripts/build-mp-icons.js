#!/usr/bin/env node
/* =====================================================================
 * build-mp-icons.js — 生成小程序地图标注图标（零依赖 PNG 编码器）
 *
 * 为什么需要这个脚本：
 *   小程序 WXSS 不能用 background-image 引本地图片（真机不显示），
 *   但 <map> 组件的 marker.iconPath / polyline.arrowIconPath 支持本地文件。
 *   项目要求零外部素材依赖，故用 Node 内置 zlib 现场生成 PNG，
 *   保证「克隆仓库即可编译」且不引入任何二进制素材。
 *
 * 产物：
 *   miniprogram/assets/pin-sit.png   坐点标（红，白环）
 *   miniprogram/assets/pin-face.png  向点标（橙，白环）
 *   miniprogram/assets/pin-locate.png 定位标（蓝，白环）
 * ===================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var zlib = require('zlib');

var ROOT = path.resolve(__dirname, '..');
var OUTDIR = path.join(ROOT, 'miniprogram', 'assets');

/* ---------------- CRC32 ---------------- */
var CRC_TABLE = (function () {
  var t = new Int32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  var c = -1;
  for (var i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* ---------------- PNG 编码 ---------------- */
function encodePNG(w, h, rgba) {
  var stride = w * 4;
  var raw = Buffer.alloc((stride + 1) * h);
  for (var y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;               /* filter type 0 (None) */
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  var idat = zlib.deflateSync(raw, { level: 9 });

  function chunk(type, data) {
    var len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    var t = Buffer.from(type, 'ascii');
    var crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  }
  var ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;    /* bit depth */
  ihdr[9] = 6;    /* color type RGBA */
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

/* ---------------- 像素绘制（3×3 超采样抗锯齿）---------------- */
function drawPin(size, fill, ring) {
  var rgba = Buffer.alloc(size * size * 4, 0);   /* 全透明 */
  var cx = size / 2, cy = size / 2;
  var rOuter = size / 2 - 1;
  var rInner = rOuter - Math.max(2, size * 0.09);
  var SS = 3;
  var hex = function (s) {
    return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
  };
  var F = hex(fill), R = hex(ring);

  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      var accR = 0, accG = 0, accB = 0, accA = 0;
      for (var sy = 0; sy < SS; sy++) {
        for (var sx = 0; sx < SS; sx++) {
          var px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
          var d = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
          var col = d <= rInner ? F : (d <= rOuter ? R : null);
          if (col) { accR += col[0]; accG += col[1]; accB += col[2]; accA += 255; }
        }
      }
      var n = SS * SS, i = (y * size + x) * 4, a = accA / n;
      if (a <= 0) continue;
      /* 非预乘 alpha，颜色需按覆盖像素数归一 */
      var cov = accA / 255;
      rgba[i] = Math.round(accR / cov);
      rgba[i + 1] = Math.round(accG / cov);
      rgba[i + 2] = Math.round(accB / cov);
      rgba[i + 3] = Math.round(a);
    }
  }
  return rgba;
}

/* ---------------- 生成 ---------------- */
fs.mkdirSync(OUTDIR, { recursive: true });

var ICONS = [
  { name: 'pin-sit.png', size: 56, fill: '#C2402A', ring: '#FFFFFF' },
  { name: 'pin-face.png', size: 56, fill: '#EF7D2D', ring: '#FFFFFF' },
  { name: 'pin-locate.png', size: 48, fill: '#2F6FB0', ring: '#FFFFFF' }
];

var report = [];
ICONS.forEach(function (ic) {
  var rgba = drawPin(ic.size, ic.fill, ic.ring);
  var buf = encodePNG(ic.size, ic.size, rgba);
  var p = path.join(OUTDIR, ic.name);
  fs.writeFileSync(p, buf);
  /* 自校验：PNG 签名 + 末尾必须为长度 0 的 IEND 块（12 字节：4 长度 + 4 类型 + 4 CRC）*/
  var head = buf.slice(0, 8).toString('hex');
  if (head !== '89504e470d0a1a0a') throw new Error(ic.name + ' 签名异常');
  if (buf.readUInt32BE(buf.length - 12) !== 0 ||
      buf.slice(buf.length - 8, buf.length - 4).toString('ascii') !== 'IEND') {
    throw new Error(ic.name + ' IEND 块异常');
  }
  var ihdrW = buf.readUInt32BE(16), ihdrH = buf.readUInt32BE(20);
  if (ihdrW !== ic.size || ihdrH !== ic.size) throw new Error(ic.name + ' IHDR 尺寸不符');

  /* 自校验：解压 IDAT，确认像素数据长度与 IHDR 声明一致（真实解码而非只看文件头）*/
  var idatStart = 8 + 25;                    /* 签名 8 + IHDR 块 25 */
  var idatLen = buf.readUInt32BE(idatStart);
  if (buf.slice(idatStart + 4, idatStart + 8).toString('ascii') !== 'IDAT') {
    throw new Error(ic.name + ' IDAT 块位置异常');
  }
  var rawPixels = zlib.inflateSync(buf.slice(idatStart + 8, idatStart + 8 + idatLen));
  var expect = (ic.size * 4 + 1) * ic.size;
  if (rawPixels.length !== expect) {
    throw new Error(ic.name + ' 像素数据长度不符：实得 ' + rawPixels.length + '，期望 ' + expect);
  }
  /* 自校验：中心像素必须是不透明填充色（防止画出全透明空图）*/
  var ci = ((ic.size >> 1) * ic.size + (ic.size >> 1)) * 4;
  var raw = rawPixels.slice((ic.size >> 1) * (ic.size * 4 + 1) + 1 + (ic.size >> 1) * 4,
                            (ic.size >> 1) * (ic.size * 4 + 1) + 1 + (ic.size >> 1) * 4 + 4);
  if (raw[3] !== 255) throw new Error(ic.name + ' 中心像素非不透明（图标绘制失败）');
  var wantRGB = [parseInt(ic.fill.slice(1, 3), 16), parseInt(ic.fill.slice(3, 5), 16),
                 parseInt(ic.fill.slice(5, 7), 16)];
  if (raw[0] !== wantRGB[0] || raw[1] !== wantRGB[1] || raw[2] !== wantRGB[2]) {
    throw new Error(ic.name + ' 中心像素颜色不符：实得 rgb(' + raw[0] + ',' + raw[1] + ',' + raw[2] +
                    ')，期望 ' + ic.fill);
  }
  report.push('  ' + ic.name.padEnd(18) + ic.size + '×' + ic.size + '  ' + buf.length + ' B');
});

console.log('[build-mp-icons] ✓ PNG 签名与 IEND 块自校验通过');
console.log('[build-mp-icons] ✓ 已生成 ' + ICONS.length + ' 个地图标注图标：');
console.log(report.join('\n'));
