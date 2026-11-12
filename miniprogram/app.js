/* =====================================================================
 * app.js — 全局状态与生命周期
 *
 * 全局共享（内存态，页面间传递）：
 *   settings        判读设置（持久化到 wx.Storage）
 *   posGcj/posWgs   测量位置（由地图准星或手动坐标设定，非设备定位）
 *   decl/declKnown  该位置的磁偏角
 *
 * ⚠️ 本工程不申请设备定位权限（规避微信 61040 地理位置接口准入），
 *    位置一律来自用户显式指定的测量点。
 * ===================================================================== */
'use strict';
var store = require('./utils/store.js');
var E = require('./utils/engine.js');

App({
  globalData: {
    settings: null,
    posWgs: null,
    posGcj: null,
    decl: null,
    declKnown: false,
    /* 首屏存储异常提示只弹一次 */
    storageHintShown: false
  },

  onLaunch: function () {
    var app = this;
    /* 设置加载（含 schema 合并与非法值过滤） */
    app.globalData.settings = store.loadSettings();

    /* 测量位置与磁偏角恢复。
       注意：onLaunch 阶段 getApp() 尚不可用，这里直接写 this.globalData，
       不要转手调用 geo.js（它内部通过 getApp() 取全局态）。 */
    var c = store.loadDecl();
    if (c) {
      app.globalData.posGcj = { lat: c.lat, lng: c.lng };
      /* 用缓存坐标按当前年份重算：WMM 磁偏角带年变率，跨年后旧值会偏 */
      try {
        var d = E.GEOMAG.declination(c.lat, c.lng, E.GEOMAG.decimalYear(new Date()), 0);
        if (isFinite(d)) {
          app.globalData.decl = d;
          app.globalData.declKnown = true;
        }
      } catch (e) { /* 保留缓存值即可 */ }
      if (!app.globalData.declKnown && typeof c.decl === 'number') {
        app.globalData.decl = c.decl;
        app.globalData.declKnown = true;
      }
    }

    /* 能力自检：离屏 canvas 是否可用（低版本基础库降级提示） */
    try {
      var cv = wx.createOffscreenCanvas({ type: '2d', width: 8, height: 8 });
      app.globalData.offscreenOk = !!cv;
    } catch (e) {
      app.globalData.offscreenOk = false;
      console.warn('[LP] 离屏 canvas 不可用，盘面将直接绘制到页面 canvas');
    }
  },

  onShow: function () {
    /* 后台唤醒：传感器在后台可能漂移，重置平滑值与判读缓存 */
    this.globalData.wakeAt = Date.now();
  },

  /* 统一保存设置（返回是否持久化成功） */
  saveSettings: function (s) {
    this.globalData.settings = s;
    return store.saveSettings(s);
  },

  /* 统一写入磁偏角 */
  setDecl: function (decl) {
    this.globalData.decl = decl;
    this.globalData.declKnown = true;
  },

  /* 生效的向方度数（含真北修正） */
  effFacing: function (heading) {
    var g = this.globalData;
    if (g.settings.trueNorthMode && g.declKnown) return E.norm(heading + g.decl);
    return E.norm(heading);
  },

  /* 术语与免责声明统一出口，便于全站文案一致性核查 */
  terms: require('./utils/terms.js')
});
