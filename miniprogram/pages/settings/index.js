/* =====================================================================
 * 设置页
 *
 * 所有设置项都通过 app.saveSettings 统一持久化，并在保存后清掉各页的
 * 判读缓存（下次进入自动重算），避免"设置改了但读数没变"的错觉。
 * 盘面缓存无需手动清理：dial.js 的缓存 key 已包含 dialStyle/72/60 三维。
 * ===================================================================== */
'use strict';
var store = require('../../utils/store.js');
var E = require('../../utils/engine.js');

var VERSION = '1.0.0';
var BUILD = 'V1.6 引擎同源';

Page({
  data: {
    s: {},
    modelText: '',
    versionFull: ''
  },

  onShow: function () {
    var app = getApp();
    if (!app.globalData.settings) app.globalData.settings = store.loadSettings();
    this.app = app;
    this.setData({
      s: app.globalData.settings,
      modelText: E.GEOMAG.model + '（' + E.GEOMAG.epoch + ' 纪元）· 与 H5 版同源',
      versionFull: '小程序 ' + VERSION + ' · ' + BUILD
    });
  },

  _commit: function () {
    var ok = this.app.saveSettings(this.data.s);
    this.setData({ s: this.app.globalData.settings });
    return ok;
  },

  /* ---------- 分段选择 ---------- */
  onSeg: function (e) {
    var k = e.currentTarget.dataset.k;
    var v = e.currentTarget.dataset.v;
    var s = this.data.s;
    if (k === 'kongwangWidth') {
      v = parseFloat(v);
      /* 浮点相等在 dataset 回读后可能不严格，统一按数值容差比较 */
      if (Math.abs(s[k] - v) < 1e-9) return;
    } else if (s[k] === v) {
      return;
    }
    s[k] = v;
    if (!this._commit()) {
      wx.showToast({ title: '本机存储不可用，设置仅本次生效', icon: 'none', duration: 3000 });
      return;
    }
    /* 让其他页面的判读缓存失效 */
    getApp().globalData.settingsChangedAt = Date.now();
    wx.showToast({ title: '设置已更新', icon: 'none', duration: 1200 });
  },

  /* ---------- 开关 ---------- */
  onToggle: function (e) {
    var k = e.currentTarget.dataset.k;
    var s = this.data.s;
    s[k] = !s[k];
    if (!this._commit()) {
      wx.showToast({ title: '本机存储不可用，设置仅本次生效', icon: 'none', duration: 3000 });
      return;
    }
    getApp().globalData.settingsChangedAt = Date.now();
  },

  /* ---------- 跳转 ---------- */
  onAbout: function () {
    wx.navigateTo({ url: '/pages/about/index' });
  },

  onFeedback: function () {
    wx.showModal({
      title: '问题反馈',
      content: '如遇读数异常，请先确认：\n1. 已远离金属/电器并完成 8 字校准\n2. 位置权限已开启（用于磁偏角）\n3. 已选择与该地区习俗一致的分金体系\n\n仍无法解决时，可在「记录」页复制测量数据一并反馈。',
      confirmText: '复制数据',
      cancelText: '关闭',
      success: function (r) {
        if (!r.confirm) return;
        var list = store.loadRecords();
        wx.setClipboardData({
          data: '【方位分金罗盘 问题反馈】\n记录数：' + list.length +
                '\n最近一条：' + (list.length ? list[list.length - 1].conclusion : '无'),
          success: function () { wx.showToast({ title: '已复制，可粘贴给开发者', icon: 'none' }); }
        });
      }
    });
  },

  onReset: function () {
    var that = this;
    wx.showModal({
      title: '恢复默认设置',
      content: '将把手势外全部设置项恢复为默认值。测量记录不会被删除。',
      success: function (r) {
        if (!r.confirm) return;
        var def = E.STORE.mergeSettings({});
        that.app.saveSettings(def);
        that.setData({ s: def });
        that.app.globalData.settingsChangedAt = Date.now();
        wx.showToast({ title: '已恢复默认', icon: 'success' });
      }
    });
  }
});
