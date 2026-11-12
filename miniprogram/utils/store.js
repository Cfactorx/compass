/* =====================================================================
 * store.js — 本地存储封装（wx.Storage 替代 localStorage）
 *
 * 与 H5 版本的差异：
 *   - localStorage.getItem → wx.getStorageSync（同步 API，语义一致）
 *   - 全部读写包 try/catch：存储不可用时降级为"本次不持久化"，
 *     绝不因存储异常导致页面白屏
 * ===================================================================== */
'use strict';
var E = require('./engine.js');

var K_SETTINGS = 'lp_settings';
var K_RECORDS = 'lp_records';
var K_DECL = 'lp_decl_cache';

var noStorage = false;

function isNoStorage() { return noStorage; }

/* 清空存储（设置页提供，供用户一键重置） */
function clearAll() {
  try {
    wx.removeStorageSync(K_SETTINGS);
    wx.removeStorageSync(K_RECORDS);
    wx.removeStorageSync(K_DECL);
  } catch (e) { /* ignore */ }
}

/* ---------------- 设置 ---------------- */
function loadSettings() {
  try {
    return E.STORE.mergeSettings(wx.getStorageSync(K_SETTINGS) || {});
  } catch (e) {
    noStorage = true;
    return E.STORE.mergeSettings({});
  }
}
function saveSettings(s) {
  if (noStorage) return false;
  try { wx.setStorageSync(K_SETTINGS, s); return true; }
  catch (e) { noStorage = true; return false; }
}

/* ---------------- 记录 ---------------- */
function loadRecords() {
  try {
    var v = wx.getStorageSync(K_RECORDS);
    return Array.isArray(v) ? v : [];
  } catch (e) { noStorage = true; return []; }
}
/* 返回 { ok:boolean, list:Array, reason:string } */
function addRecord(rec) {
  var list = E.STORE.pushRecord(loadRecords(), rec, 50);
  if (noStorage) return { ok: false, list: list, reason: 'no-storage' };
  try { wx.setStorageSync(K_RECORDS, list); return { ok: true, list: list, reason: '' }; }
  catch (e) { noStorage = true; return { ok: false, list: list, reason: 'quota' }; }
}
function removeRecord(id) {
  var list = loadRecords().filter(function (x) { return x.id !== id; });
  if (!noStorage) { try { wx.setStorageSync(K_RECORDS, list); } catch (e) { noStorage = true; } }
  return list;
}

/* ---------------- 磁偏角缓存（24h 有效）---------------- */
function loadDecl() {
  try {
    var c = wx.getStorageSync(K_DECL);
    if (c && typeof c.decl === 'number' && typeof c.ts === 'number' &&
        Date.now() - c.ts < 24 * 3600 * 1000) {
      return c;
    }
  } catch (e) { /* ignore */ }
  return null;
}
function saveDecl(lat, lng, decl) {
  if (noStorage) return;
  try { wx.setStorageSync(K_DECL, { lat: lat, lng: lng, decl: decl, ts: Date.now() }); }
  catch (e) { /* ignore */ }
}

module.exports = {
  isNoStorage: isNoStorage,
  clearAll: clearAll,
  loadSettings: loadSettings,
  saveSettings: saveSettings,
  loadRecords: loadRecords,
  addRecord: addRecord,
  removeRecord: removeRecord,
  loadDecl: loadDecl,
  saveDecl: saveDecl
};
