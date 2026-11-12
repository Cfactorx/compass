/* =====================================================================
 * 地图量测页
 *
 * 与 H5 自实现 Slippy 瓦片地图的差异：
 *   H5：自绘瓦片 + canvas overlay + pointer 手势（长按选坐点、拖手柄定向）
 *   小程序：原生 <map> 组件，改为「中心准星取坐点 + 点击地图取向点」
 *
 * 为何改用准星方案：
 *   小程序 map 的 markers 不支持拖拽事件，且原生组件上的触摸事件
 *   无法可靠地与地图平移/缩放手势区分。准星方案把「移动地图」
 *   这一原生手势用于取点，交互更稳、精度更高（可放大到 18 级再取点）。
 *
 * 坐标系：map 组件使用 GCJ-02；bearing / 磁偏角计算前统一转 WGS-84
 * ===================================================================== */
'use strict';
var E = require('../../utils/engine.js');
var store = require('../../utils/store.js');
var geo = require('../../utils/geo.js');

var MIN_SCALE = 3, MAX_SCALE = 20;

Page({
  data: {
    center: { lat: 23.12908, lng: 113.26436 },   /* GCJ-02 广州，默认中心 */
    scale: 13,
    markers: [],
    polyline: [],
    sit: null,
    face: null,
    hint: '拖动地图，把十字准星对准目标位置',
    centerText: '—',
    card: null,
    inpLat: '',
    inpLng: ''
  },

  onLoad: function () {
    this.app = getApp();
    if (!this.app.globalData.settings) {
      this.app.globalData.settings = store.loadSettings();
    }
    this._cardKey = null;
  },

  onShow: function () {
    /* 设置页可能改过分金体系/界线宽度等，回到本页必须重算 */
    this._cardKey = null;
    if (this.data.sit && this.data.face) this._updateCard();
  },

  onReady: function () {
    this.mapCtx = wx.createMapContext('lpMap', this);
    /* 已设定过测量位置 → 回到该位置，用户不必每次重新找地方 */
    var c = this.app.globalData.posGcj;
    if (c) {
      this.setData({ center: { lat: c.lat, lng: c.lng }, scale: 16 });
    }
  },

  /* ---------- 地图事件 ---------- */
  onRegionChange: function (e) {
    if (!e.detail || e.detail.type !== 'end') return;
    var that = this;
    this.mapCtx.getCenterLocation({
      success: function (res) {
        var txt = res.latitude.toFixed(5) + ', ' + res.longitude.toFixed(5);
        if (txt !== that.data.centerText) that.setData({ centerText: txt });
      },
      fail: function () { /* ignore */ }
    });
  },

  /* 点击地图 → 若有坐点则设为向方点 */
  onMapTap: function (e) {
    if (!this.data.sit) {
      wx.showToast({ title: '请先设置坐山点', icon: 'none', duration: 2000 });
      return;
    }
    var lat = e.detail && e.detail.latitude, lng = e.detail && e.detail.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;
    this._setFace({ lat: lat, lng: lng });
  },

  /* 取地图中心为坐山点 */
  onSetSit: function () {
    var that = this;
    this.mapCtx.getCenterLocation({
      success: function (res) {
        var sit = { lat: res.latitude, lng: res.longitude };
        var hadFace = !!that.data.face;
        that.setData({
          sit: sit,
          /* 重设坐点时清掉旧向点，避免坐向错位 */
          face: null,
          hint: '已设定坐山点，请点击地图选择「向方点」'
        });
        that._renderMarkers();
        wx.showToast({
          title: hadFace ? '已更新坐山点，请重新定向' : '已设定坐山点，请点击地图定向',
          icon: 'none',
          duration: 2400
        });
      },
      fail: function () {
        wx.showToast({ title: '取点失败，请重试', icon: 'none' });
      }
    });
  },

  /* 兜底定向路径：个别机型/基础库上地图 bindtap 可能被原生层吞掉，
     此入口允许「拖动地图把准星对准目标 → 点按钮」完成定向，与 tap 等价 */
  onSetFaceByCrosshair: function () {
    var that = this;
    if (!this.data.sit) {
      wx.showToast({ title: '请先设置坐山点', icon: 'none' });
      return;
    }
    this.mapCtx.getCenterLocation({
      success: function (res) {
        that._setFace({ lat: res.latitude, lng: res.longitude });
      },
      fail: function () {
        wx.showToast({ title: '取点失败，请重试', icon: 'none' });
      }
    });
  },

  _setFace: function (pt) {
    var sit = this.data.sit;
    if (!sit) return;
    /* 两点重合保护：屏距过近时方位角无意义 */
    var wgsS = E.GEO.gcj02ToWgs84(sit.lat, sit.lng);
    var wgsF = E.GEO.gcj02ToWgs84(pt.lat, pt.lng);
    if (E.GEO.distance(wgsS[0], wgsS[1], wgsF[0], wgsF[1]) < 1) {
      wx.showToast({ title: '向方点与坐山点过近，请点远一些', icon: 'none', duration: 2400 });
      return;
    }
    this.setData({ face: pt, hint: '已定向。可继续点击地图或拖动准星调整向方点' });
    this._renderMarkers();
    this._updateCard();
  },

  onSwap: function () {
    var sit = this.data.sit, face = this.data.face;
    if (!sit || !face) return;
    this.setData({ sit: face, face: sit, hint: '已反转坐向' });
    this._renderMarkers();
    this._updateCard();
  },

  onClear: function () {
    this._cardKey = null;
    this.setData({
      sit: null, face: null, markers: [], polyline: [], card: null,
      hint: '拖动地图，把十字准星对准目标位置'
    });
  },

  onZoomIn: function () {
    this.setData({ scale: Math.min(MAX_SCALE, this.data.scale + 1) });
  },
  onZoomOut: function () {
    this.setData({ scale: Math.max(MIN_SCALE, this.data.scale - 1) });
  },

  /* 以十字准星所在坐标作为「测量位置」，据此计算磁偏角。
     本工具不申请设备定位权限（规避微信 61040 准入），
     位置一律由用户显式指定——这也更贴合语义：需要的是所测地点的
     磁偏角，而不是手机当前所在地的磁偏角。 */
  onSetMeasurePos: function () {
    var that = this;
    this.mapCtx.getCenterLocation({
      success: function (res) {
        var r = geo.setMeasurePos(res.latitude, res.longitude);
        if (!r || r.decl == null) {
          wx.showToast({ title: '该坐标无法计算磁偏角', icon: 'none' });
          return;
        }
        /* 测量位置变了，已算出的判读需要重算 */
        that._cardKey = null;
        if (that.data.sit && that.data.face) that._updateCard();
        else that._refreshPosChip();
        wx.showToast({
          title: '测量位置已设定，磁偏角 ' + (r.decl >= 0 ? '+' : '') + r.decl.toFixed(1) + '°',
          icon: 'none',
          duration: 2600
        });
      },
      fail: function () {
        wx.showToast({ title: '取点失败，请重试', icon: 'none' });
      }
    });
  },

  _refreshPosChip: function () {
    var p = this.app.globalData.posGcj;
    var st = this.app.globalData.settings;
    this.setData({
      hint: p
        ? '测量位置：' + geo.fmtCoord(p.lat, p.lng, st.coordFormat) +
          ' · ' + geo.declText(this.app.globalData.declKnown, this.app.globalData.decl)
        : '拖动地图把准星对准目标，再点「以准星为测量位置」'
    });
  },

  /* ---------- 坐标直接跳转 ---------- */
  onInpLat: function (e) { this.setData({ inpLat: e.detail.value }); },
  onInpLng: function (e) { this.setData({ inpLng: e.detail.value }); },

  onGoCoord: function () {
    var p = geo.parseCoord(this.data.inpLat, this.data.inpLng);
    if (!p) {
      wx.showToast({ title: '坐标格式不正确（纬度 -85~85，经度 -180~180）', icon: 'none', duration: 2600 });
      return;
    }
    this.setData({
      center: { lat: p.lat, lng: p.lng },
      scale: Math.max(this.data.scale, 16)
    });
    /* 输入坐标本身就是一次明确的「指定测量位置」动作，直接设为测量位置 */
    var r = geo.setMeasurePos(p.lat, p.lng);
    this._cardKey = null;
    if (this.data.sit && this.data.face) this._updateCard();
    else this._refreshPosChip();
    wx.showToast({
      title: r && r.decl != null
        ? '已跳转并设为测量位置（磁偏角 ' + (r.decl >= 0 ? '+' : '') + r.decl.toFixed(1) + '°）'
        : '已跳转',
      icon: 'none',
      duration: 2800
    });
  },

  /* ---------- 标注渲染 ---------- */
  _renderMarkers: function () {
    var sit = this.data.sit, face = this.data.face;
    var markers = [], polyline = [];
    if (sit) {
      markers.push(this._mk(1, sit, '/assets/pin-sit.png', '坐', '#C2402A'));
    }
    if (face) {
      markers.push(this._mk(2, face, '/assets/pin-face.png', '向', '#EF7D2D'));
    }
    if (sit && face) {
      polyline.push({
        points: [
          { latitude: sit.lat, longitude: sit.lng },
          { latitude: face.lat, longitude: face.lng }
        ],
        color: '#EF7D2DCC',
        width: 5,
        dottedLine: true,
        arrowLine: false
      });
    }
    this.setData({ markers: markers, polyline: polyline });
  },

  _mk: function (id, pt, icon, text, color) {
    return {
      id: id,
      latitude: pt.lat,
      longitude: pt.lng,
      iconPath: icon,
      width: 26,
      height: 26,
      anchor: { x: 0.5, y: 0.5 },
      zIndex: id === 2 ? 20 : 10,
      label: {
        content: text,
        color: '#FFFFFF',
        fontSize: 11,
        bgColor: color,
        padding: 4,
        borderRadius: 6,
        textAlign: 'center',
        anchorX: -11,
        anchorY: -40
      }
    };
  },

  /* ---------- 判读 ---------- */
  _updateCard: function () {
    var app = this.app, T = app.terms, st = app.globalData.settings;
    var sit = this.data.sit, face = this.data.face;
    if (!sit || !face) return;

    var wgsS = E.GEO.gcj02ToWgs84(sit.lat, sit.lng);
    var wgsF = E.GEO.gcj02ToWgs84(face.lat, face.lng);
    var Tr = E.GEO.bearing(wgsS[0], wgsS[1], wgsF[0], wgsF[1]);   /* 向方真北方位角 */
    var dist = E.GEO.distance(wgsS[0], wgsS[1], wgsF[0], wgsF[1]);

    /* 测量位置 = 坐向连线中点（GCJ-02）。
       注意：中点必须在 GCJ-02 系内求，再交给 setMeasurePos 做 GCJ→WGS 转换；
       若先转 WGS 再取中点，等于把 WGS 坐标当 GCJ 用，会有约 500m 的系统偏移。 */
    var midGcj = E.GEO.midpoint(sit.lat, sit.lng, face.lat, face.lng);
    geo.setMeasurePos(midGcj[0], midGcj[1]);
    var D = app.globalData.declKnown ? app.globalData.decl : 0;
    var M = E.norm(Tr - D);                                       /* 向方磁北方位角 */

    /* 去重：坐向与磁偏角都没变就不重算（点击地图会高频触发）
       注意：key 必须覆盖所有会影响判读结果的设置项，否则改设置后读数不刷新 */
    var key = sit.lat.toFixed(7) + ',' + sit.lng.toFixed(7) + '|' +
              face.lat.toFixed(7) + ',' + face.lng.toFixed(7) + '|' + D.toFixed(3) +
              '|' + st.trueNorthMode + st.fenjinMode + st.showLong72 + st.showLong60 +
              '|' + st.kongwangWidth;
    if (key === this._cardKey) return;
    this._cardKey = key;

    var analyzeDeg = st.trueNorthMode ? Tr : M;
    var r = E.analyze(E.norm(analyzeDeg + 180), st);   /* 坐方 = 向方 + 180 */
    var tag = T.statusTag(r);

    var chips = [];
    chips.push({ text: '分金 ' + T.fenjinLabel(r.fenjin), cls: 'hl' });
    chips.push({ text: '向方真北 ' + Tr.toFixed(1) + '°', cls: '' });
    chips.push({ text: '向方磁北 ' + M.toFixed(1) + '°', cls: '' });
    if (app.globalData.declKnown) {
      chips.push({
        text: '磁偏角 ' + (D >= 0 ? '+' : '') + D.toFixed(1) + '°',
        cls: ''
      });
    }
    chips.push({
      text: '线长 ' + (dist >= 1000 ? (dist / 1000).toFixed(2) + ' km' : dist.toFixed(0) + ' m'),
      cls: ''
    });
    if (r.kongwang) chips.push({ text: T.boundaryLabel(r.kongwang), cls: 'alert' });
    var sug = T.suggestionText(r.suggestion);
    if (sug) chips.push({ text: sug, cls: '' });

    var kv = [];
    kv.push({ k: '坐点坐标', v: geo.fmtCoord(sit.lat, sit.lng, st.coordFormat) + '（GCJ-02）' });
    kv.push({ k: '向点坐标', v: geo.fmtCoord(face.lat, face.lng, st.coordFormat) + '（GCJ-02）' });
    kv.push({ k: '向方真北', v: Tr.toFixed(2) + '°' });
    kv.push({ k: '向方磁北', v: M.toFixed(2) + '° = 真北 − 磁偏角' });
    kv.push({ k: '坐方度数', v: r.sittingDeg.toFixed(2) + '°' });
    kv.push({
      k: '偏出中线',
      v: r.offset.toFixed(2) + '°（' +
         (r.offset <= 1.5 ? '居中域' : (r.offset <= 4.5 ? '兼向域' : '偏角过大')) + '）'
    });
    kv.push({
      k: '分金格',
      v: r.fenjin.ganZhi + ' · ' + r.fenjin.start.toFixed(1) + '°–' + r.fenjin.end.toFixed(1) +
         '° · ' + (st.fenjinMode === '240' ? '1.5°格' : '3°格')
    });
    if (st.showLong72) kv.push({ k: '穿山七十二龙', v: T.dragonText(E.long72At(r.sittingDeg), '72') });
    if (st.showLong60) kv.push({ k: '透地六十龙', v: T.dragonText(E.long60At(r.sittingDeg), '60') });
    kv.push({ k: '判读结论', v: T.conclusionOf(r) });

    this.setData({
      card: {
        conc: '坐' + r.sittingMountain.name + '山' + r.facingMountain.name + '向 · ' + T.jianLabel(r.jian),
        tagLevel: tag.level,
        tagText: tag.text,
        chips: chips,
        kv: kv
      }
    });
  },

  /* ---------- 保存 ---------- */
  onSave: function () {
    var app = this.app, T = app.terms, st = app.globalData.settings;
    var sit = this.data.sit, face = this.data.face;
    if (!sit || !face) {
      wx.showToast({ title: '请先选点并定向', icon: 'none' });
      return;
    }
    var wgsS = E.GEO.gcj02ToWgs84(sit.lat, sit.lng);
    var wgsF = E.GEO.gcj02ToWgs84(face.lat, face.lng);
    var Tr = E.GEO.bearing(wgsS[0], wgsS[1], wgsF[0], wgsF[1]);
    var dist = E.GEO.distance(wgsS[0], wgsS[1], wgsF[0], wgsF[1]);
    /* 同 _updateCard：中点必须在 GCJ-02 系内求 */
    var midGcj = E.GEO.midpoint(sit.lat, sit.lng, face.lat, face.lng);
    geo.setMeasurePos(midGcj[0], midGcj[1]);
    var D = app.globalData.declKnown ? app.globalData.decl : 0;
    var M = E.norm(Tr - D);
    var r = E.analyze(E.norm((st.trueNorthMode ? Tr : M) + 180), st);

    var rec = {
      id: Date.now(),
      ts: this._nowText(),
      mode: 'map',
      conclusion: T.conclusionOf(r),
      sit: r.sittingMountain.name,
      face: r.facingMountain.name,
      fenjin: r.fenjin.ganZhi,
      attr: T.ATTR_NEUTRAL[r.fenjin.attr] || r.fenjin.attr,
      sittingDeg: +r.sittingDeg.toFixed(2),
      facingDeg: +r.facingDeg.toFixed(2),
      decl: app.globalData.declKnown ? +D.toFixed(2) : null,
      source: '地图取点',
      extra: {
        sit: [+sit.lat.toFixed(6), +sit.lng.toFixed(6)],
        face: [+face.lat.toFixed(6), +face.lng.toFixed(6)],
        trueBearing: +Tr.toFixed(2),
        magneticBearing: +M.toFixed(2),
        distM: Math.round(dist)
      }
    };
    var res = store.addRecord(rec);
    if (res.ok) wx.showToast({ title: '已保存到记录', icon: 'success' });
    else if (res.reason === 'quota') wx.showToast({ title: '存储空间已满，请到记录页清理', icon: 'none', duration: 3000 });
    else wx.showToast({ title: '本机存储不可用，记录未保存', icon: 'none', duration: 3000 });
  },

  _nowText: function () {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
           p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  },

  onShareAppMessage: function () {
    return { title: '方位分金罗盘 · 地图量测', path: '/pages/live/index' };
  }
});
