/* =====================================================================
 * geo.js — 测量位置与磁偏角（WMM2025）
 *
 * ⚠️ 本工程**不申请任何设备定位权限**，因此不调用 wx.getLocation 等
 *    地理位置接口。原因有两条，都很硬：
 *
 *    1) 平台准入：微信自 2022-07-14 起对 8 个地理位置接口实行准入制。
 *       代码里一旦出现 wx.getLocation，而该 AppID 未获得对应接口权限，
 *       上传/提交审核会直接报 **61040**（地理位置接口权限或声明缺失）。
 *       新账号默认无此权限，会卡死整个发布流程。
 *
 *    2) 语义更正：本工具需要的是「所测量的那个地点」的磁偏角，
 *       而不是「手机当前所在位置」的磁偏角。测量对象可能是一处宅基、
 *       一个地块，人未必站在那里。用测量点自身坐标算磁偏角才是对的。
 *
 *    位置来源（二者等价，均为 GCJ-02）：
 *      · 地图页把十字准星对准目标后点「以准星为测量位置」
 *      · 地图页 / 罗盘页手动输入经纬度
 *
 * 磁偏角：M = T − D（东偏为正）；真北 = 磁北 + 磁偏角
 * ===================================================================== */
'use strict';
var E = require('./engine.js');
var store = require('./store.js');

/* 计算并持久化磁偏角；返回度数值，坐标非法时返回 null */
function computeDecl(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      !isFinite(lat) || !isFinite(lng)) return null;
  try {
    var dy = E.GEOMAG.decimalYear(new Date());
    var d = E.GEOMAG.declination(lat, lng, dy, 0);
    if (isFinite(d)) {
      store.saveDecl(lat, lng, d);
      var app = getApp();
      if (app && app.setDecl) app.setDecl(d);
      return d;
    }
  } catch (e) { /* ignore */ }
  return null;
}

/* 设定测量位置（GCJ-02），顺带算出该点磁偏角
 * 返回 { decl, wgs, gcj } 或 null */
function setMeasurePos(gcjLat, gcjLng) {
  if (typeof gcjLat !== 'number' || typeof gcjLng !== 'number') return null;
  var wgs = E.GEO.gcj02ToWgs84(gcjLat, gcjLng);
  var d = computeDecl(wgs[0], wgs[1]);
  var app = getApp();
  if (app && app.globalData) {
    app.globalData.posGcj = { lat: gcjLat, lng: gcjLng };
    app.globalData.posWgs = { lat: wgs[0], lng: wgs[1] };
  }
  return { decl: d, wgs: { lat: wgs[0], lng: wgs[1] }, gcj: { lat: gcjLat, lng: gcjLng } };
}

/* 从缓存恢复测量位置（应用启动时调用）。返回 { lat, lng, decl, ts } 或 null */
function restoreMeasurePos() {
  var c = store.loadDecl();
  if (!c) return null;
  /* 用缓存坐标重算一次：磁偏角带年变率，跨年后缓存值需要更新 */
  computeDecl(c.lat, c.lng);
  var app = getApp();
  if (app && app.globalData) {
    app.globalData.posGcj = { lat: c.lat, lng: c.lng };
  }
  return c;
}

/* 解析用户输入的坐标串，成功返回 {lat,lng}，失败返回 null */
function parseCoord(latStr, lngStr) {
  var la = parseFloat(String(latStr).trim());
  var lg = parseFloat(String(lngStr).trim());
  if (!isFinite(la) || !isFinite(lg)) return null;
  if (la < -85 || la > 85 || lg < -180 || lg > 180) return null;
  return { lat: la, lng: lg };
}

/* 坐标格式化（度 / 度分秒） */
function fmtCoord(lat, lng, format) {
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      !isFinite(lat) || !isFinite(lng)) return '未设定';
  if (format === 'dms') return E.formatDMS(lat, true) + ' ' + E.formatDMS(lng, false);
  return lat.toFixed(5) + ', ' + lng.toFixed(5);
}

/* 磁偏角文案 */
function declText(declKnown, decl) {
  if (!declKnown) return '磁偏角：未设定测量位置（按 0° 参与判读）';
  return '磁偏角：' + (decl >= 0 ? '+' : '') + decl.toFixed(1) + '°（' +
         (decl >= 0 ? '东偏' : '西偏') + ' · ' + E.GEOMAG.model + '）';
}

module.exports = {
  computeDecl: computeDecl,
  setMeasurePos: setMeasurePos,
  restoreMeasurePos: restoreMeasurePos,
  parseCoord: parseCoord,
  fmtCoord: fmtCoord,
  declText: declText
};
