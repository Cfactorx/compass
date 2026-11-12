/* =====================================================================
 * 实地罗盘页
 *
 * 数据流：
 *   wx.onCompassChange(direction)  →  headingTarget（磁北向方角）
 *                                  ↓
 *   动画循环：低通平滑 → dial.drawCompass（盘面旋转 + 分金格高亮）
 *                    → 徽标文案 / 判读卡（仅在变化 ≥0.2° 时 setData）
 *
 * 性能要点（沿用 H5 V1.6 P2 修复经验）：
 *   - 盘面走 canvas 离屏缓存，设置切换不重算
 *   - setData 严格节流：徽标 0.1° 粒度、判读卡 0.2° 粒度，
 *     传感器 60fps 回调绝不直接 setData
 * ===================================================================== */
'use strict';
var E = require('../../utils/engine.js');
var dial = require('../../utils/dial.js');
var compass = require('../../utils/compass.js');
var store = require('../../utils/store.js');
var geo = require('../../utils/geo.js');

var MAX_DIAL = 430;      /* 盘面最大逻辑边长（px），与 H5 版一致 */

Page({
  data: {
    cw: 300,
    badgeText: '— · —',
    sensorText: '正在检测方向传感器…',
    sensorCls: '',
    hasHeading: false,
    manualVisible: false,
    manualVal: 0,
    card: null,
    /* 测量位置（磁偏角依据） */
    posText: '测量位置未设定 · 磁偏角按 0° 计算',
    posSet: false,
    inpLat: '',
    inpLng: ''
  },

  /* ---------- 生命周期 ---------- */
  onLoad: function () {
    this.app = getApp();
    if (!this.app.globalData.settings) {
      this.app.globalData.settings = store.loadSettings();
    }
    /* 内部状态（不进 data，避免高频 setData） */
    this.headingTarget = 0;
    this.sm = 0;
    this.hasHeading = false;
    this.lastCardDeg = null;
    this.lastBadge = null;
    this._raf = null;
    this._destroyed = false;
    this._interfereAt = 0;
    this._sensorTimer = null;
  },

  onReady: function () {
    var that = this;
    var info;
    try {
      info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (e) {
      info = { screenWidth: 375, pixelRatio: 2 };
    }
    var cw = Math.min((info.screenWidth || 375) - 24, MAX_DIAL);
    that.setData({ cw: cw }, function () {
      wx.nextTick(function () { that._setupCanvas(cw, info.pixelRatio || 2); });
    });
  },

  onShow: function () {
    var that = this;
    /* 唤醒重置：传感器在后台可能漂移到极端值，直接吸附避免长时间旋转 */
    that.sm = that.headingTarget;
    that.lastCardDeg = null;
    that.lastBadge = null;
    /* 测量位置可能在地图页被改过 → 回到本页要刷新并重算判读 */
    that._refreshPos();
    that._startSensor();
  },

  /* ---------- 测量位置 ---------- */
  _refreshPos: function () {
    var g = this.app.globalData;
    var st = g.settings;
    if (g.posGcj && g.declKnown) {
      this.setData({
        posSet: true,
        posText: geo.fmtCoord(g.posGcj.lat, g.posGcj.lng, st.coordFormat) + ' · ' +
                 '磁偏角 ' + (g.decl >= 0 ? '+' : '') + g.decl.toFixed(2) + '°（' +
                 (g.decl >= 0 ? '东偏' : '西偏') + '）'
      });
    } else {
      this.setData({ posSet: false, posText: '测量位置未设定 · 磁偏角按 0° 计算' });
    }
    if (this.hasHeading) {
      this.lastCardDeg = null;
      this._updateCard();
    }
  },

  goSetPos: function () {
    wx.switchTab({ url: '/pages/map/index' });
  },

  onInpLat: function (e) { this.setData({ inpLat: e.detail.value }); },
  onInpLng: function (e) { this.setData({ inpLng: e.detail.value }); },

  onSetPosByInput: function () {
    var p = geo.parseCoord(this.data.inpLat, this.data.inpLng);
    if (!p) {
      wx.showToast({
        title: '坐标格式不正确（纬度 -85~85，经度 -180~180）',
        icon: 'none',
        duration: 2600
      });
      return;
    }
    var r = geo.setMeasurePos(p.lat, p.lng);
    if (!r || r.decl == null) {
      wx.showToast({ title: '该坐标无法计算磁偏角', icon: 'none' });
      return;
    }
    this._refreshPos();
    wx.showToast({
      title: '测量位置已设定（磁偏角 ' + (r.decl >= 0 ? '+' : '') + r.decl.toFixed(2) + '°）',
      icon: 'none',
      duration: 2600
    });
  },

  onHide: function () {
    this._stopLoop();
    compass.stop();
    if (this._sensorTimer) { clearTimeout(this._sensorTimer); this._sensorTimer = null; }
  },

  onUnload: function () {
    this._destroyed = true;
    this._stopLoop();
    compass.stop();
  },

  /* ---------- 画布初始化 ---------- */
  _setupCanvas: function (cw, dpr) {
    var that = this;
    wx.createSelectorQuery()
      .in(this)
      .select('#dial')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) {
          console.warn('[live] canvas 节点获取失败，降级为纯文字判读');
          that.setData({ sensorText: '盘面渲染不可用，判读功能仍可正常使用' });
          return;
        }
        var canvas = res[0].node;
        var w = res[0].width || cw;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(w * dpr);
        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        that.canvas = canvas;
        that.ctx = ctx;
        that.cwPx = w;
        that._startLoop();
      });
  },

  /* ---------- 动画循环 ---------- */
  _startLoop: function () {
    var that = this;
    if (that._raf || that._destroyed) return;
    var step = function () {
      if (that._destroyed || !that.canvas) return;
      var target = that.headingTarget;
      var cur = that.sm;
      var delta = ((target - cur + 540) % 360) - 180;
      if (Math.abs(delta) > 0.02) that.sm = E.norm(cur + delta * 0.22);
      else that.sm = E.norm(target);

      dial.drawCompass(that.ctx, that.cwPx, that.sm, that.lastCardDeg,
        that.app.globalData.settings);
      that._updateBadge();
      that._updateCard();

      that._raf = that.canvas.requestAnimationFrame(step);
    };
    that._raf = that.canvas.requestAnimationFrame(step);
  },
  _stopLoop: function () {
    if (this._raf && this.canvas) {
      try { this.canvas.cancelAnimationFrame(this._raf); } catch (e) { /* ignore */ }
    }
    this._raf = null;
  },

  /* ---------- 徽标（0.1° 粒度节流）---------- */
  _updateBadge: function () {
    var d = this.app.effFacing(this.headingTarget);
    var txt = d.toFixed(1) + '° · ' + E.mountainAt(d).name + '（向）';
    if (txt !== this.lastBadge) {
      this.lastBadge = txt;
      this.setData({ badgeText: txt });
    }
  },

  /* ---------- 判读卡（0.2° 粒度节流）---------- */
  _updateCard: function () {
    if (!this.hasHeading) return;
    var facing = this.app.effFacing(this.headingTarget);
    if (this.lastCardDeg !== null &&
        Math.abs(((facing - this.lastCardDeg + 540) % 360) - 180) < 0.2) return;
    this.lastCardDeg = facing;
    this.setData({ card: this._buildCard(facing) });
  },

  _buildCard: function (facing) {
    var app = this.app;
    var st = app.globalData.settings;
    var T = app.terms;
    var sitDeg = E.norm(facing + 180);
    var r = E.analyze(sitDeg, st);
    var tag = T.statusTag(r);

    var chips = [];
    chips.push({ text: '分金 ' + T.fenjinLabel(r.fenjin), cls: 'hl' });
    if (app.globalData.declKnown) {
      var D = app.globalData.decl;
      var M = E.norm(st.trueNorthMode ? (r.facingDeg - D) : r.facingDeg);
      var Tr = E.norm(st.trueNorthMode ? r.facingDeg : (r.facingDeg + D));
      chips.push({ text: '磁北 ' + M.toFixed(1) + '°', cls: '' });
      chips.push({ text: '真北 ' + Tr.toFixed(1) + '°', cls: '' });
    } else {
      chips.push({
        text: (st.trueNorthMode ? '真北' : '磁北') + ' 向方 ' + r.facingDeg.toFixed(1) + '°',
        cls: ''
      });
    }
    if (r.kongwang) chips.push({ text: T.boundaryLabel(r.kongwang), cls: 'alert' });
    var sug = T.suggestionText(r.suggestion);
    if (sug) chips.push({ text: sug, cls: '' });

    var kv = [];
    kv.push({ k: '判读结论', v: T.conclusionOf(r) });
    kv.push({ k: '坐方度数', v: r.sittingDeg.toFixed(2) + '°' });
    kv.push({ k: '向方度数', v: r.facingDeg.toFixed(2) + '°' });
    kv.push({
      k: '偏出中线',
      v: r.offset.toFixed(2) + '°（' +
         (r.offset <= 1.5 ? '居中域' : (r.offset <= 4.5 ? '兼向域' : '偏角过大')) + '）'
    });
    kv.push({
      k: '分金格',
      v: r.fenjin.ganZhi + ' · ' + r.fenjin.start.toFixed(1) + '°–' + r.fenjin.end.toFixed(1) +
         '° · ' + (st.fenjinMode === '240' ? '1.5°格' : '3°格') +
         ' · ' + (T.ATTR_NEUTRAL[r.fenjin.attr] || r.fenjin.attr)
    });
    if (st.showLong72) {
      kv.push({ k: '穿山七十二龙', v: T.dragonText(E.long72At(r.sittingDeg), '72') });
    }
    if (st.showLong60) {
      kv.push({ k: '透地六十龙', v: T.dragonText(E.long60At(r.sittingDeg), '60') });
    }
    if (app.globalData.declKnown) {
      var D2 = app.globalData.decl;
      kv.push({
        k: '磁偏角',
        v: (D2 >= 0 ? '+' : '') + D2.toFixed(2) + '°（' + (D2 >= 0 ? '东偏' : '西偏') +
           '，' + E.GEOMAG.model + '）'
      });
    } else {
      kv.push({ k: '磁偏角', v: '未定位，按 0° 参与判读' });
    }
    kv.push({ k: '判定依据', v: '地盘正针 · 三合盘 · 丙庚/丁辛 主次格，甲壬/乙癸 偏空格，戊己居中' });

    return {
      conc: '坐' + r.sittingMountain.name + '山' + r.facingMountain.name + '向 · ' + T.jianLabel(r.jian),
      tagLevel: tag.level,
      tagText: tag.text,
      chips: chips,
      kv: kv
    };
  },

  /* ---------- 传感器 ---------- */
  _startSensor: function () {
    var that = this;
    if (that.manualOn) return;
    compass.start(function (dir, accuracy) {
      if (that.manualOn) return;
      that.headingTarget = dir;
      if (!that.hasHeading) {
        that.hasHeading = true;
        that.sm = dir;
        that.setData({ hasHeading: true });
        that._setSensorStatus('ok', '方向传感器：系统磁力计（实时）');
      }
      /* 精度差 → 干扰提示（30s 内不重复） */
      var lv = compass.accuracyLevel(accuracy);
      if (lv === 'poor' && Date.now() - that._interfereAt > 30000) {
        that._interfereAt = Date.now();
        wx.showToast({
          title: '磁力计精度较低，请远离金属/电器或画 8 字校准',
          icon: 'none',
          duration: 3200
        });
      }
    }, function () {
      that._setSensorStatus('', '未检测到磁力计，可用手动转盘或地图量测');
      that.setData({ manualVisible: true });
      that.manualOn = true;
    });

    /* 2.5s 兜底：传感器无任何回调 → 引导手动模式 */
    if (that._sensorTimer) clearTimeout(that._sensorTimer);
    that._sensorTimer = setTimeout(function () {
      if (!that.hasHeading && !that.manualOn) {
        that._setSensorStatus('warn', '未获取到方向数据，已开启手动转盘');
        that.setData({ manualVisible: true });
        that.manualOn = true;
      }
    }, 2500);
  },

  _setSensorStatus: function (cls, text) {
    this.setData({ sensorCls: cls, sensorText: text });
  },

  /* ---------- 交互 ---------- */
  onDialTap: function () {
    if (!this.hasHeading) {
      wx.showToast({ title: '请将手机平放并缓慢画 8 字', icon: 'none', duration: 2600 });
    }
  },

  toggleManual: function () {
    var on = !this.data.manualVisible;
    this.manualOn = on;
    if (on) {
      compass.stop();
      this.hasHeading = true;
      this.headingTarget = this.data.manualVal;
      this.sm = this.headingTarget;
      this.lastCardDeg = null;
      this._setSensorStatus('warn', '手动转盘模式（读数由滑杆设定）');
      this.setData({ manualVisible: true, hasHeading: true, card: this._buildCard(this.headingTarget) });
    } else {
      this.setData({ manualVisible: false });
      this._startSensor();
    }
  },

  onManualChange: function (e) {
    var v = Number(e.detail.value) || 0;
    this.manualOn = true;
    this.hasHeading = true;
    this.headingTarget = v;
    this.setData({ manualVal: v, hasHeading: true });
    /* 滑杆拖动期间直接重算判读（滑杆本身就是低频事件，无需节流） */
    this.lastCardDeg = null;
    this._updateCard();
  },

  onCalibrate: function () {
    wx.showModal({
      title: '校准指南针',
      content: '请手持手机在空中缓慢画「8」字，旋转数圈；并远离金属、电器等磁场干扰源。\n\n读数稳定后即可继续测量。',
      confirmText: '我已校准',
      showCancel: false
    });
  },

  onSave: function () {
    var that = this;
    if (!that.hasHeading) {
      wx.showToast({ title: '尚未获取方向数据，无法保存', icon: 'none' });
      return;
    }
    var st = that.app.globalData.settings;
    var sitDeg = E.norm(that.app.effFacing(that.headingTarget) + 180);
    var r = E.analyze(sitDeg, st);
    var rec = {
      id: Date.now(),
      ts: that._nowText(),
      mode: 'live',
      conclusion: that.app.terms.conclusionOf(r),
      sit: r.sittingMountain.name,
      face: r.facingMountain.name,
      fenjin: r.fenjin.ganZhi,
      attr: that.app.terms.ATTR_NEUTRAL[r.fenjin.attr] || r.fenjin.attr,
      sittingDeg: +r.sittingDeg.toFixed(2),
      facingDeg: +r.facingDeg.toFixed(2),
      decl: that.app.globalData.declKnown ? +that.app.globalData.decl.toFixed(2) : null,
      source: that.manualOn ? '手动转盘' : '磁力计实测'
    };
    var res = store.addRecord(rec);
    if (res.ok) {
      wx.showToast({ title: '已保存到记录', icon: 'success' });
    } else if (res.reason === 'quota') {
      wx.showToast({ title: '存储空间已满，请到记录页清理', icon: 'none', duration: 3000 });
    } else {
      wx.showToast({ title: '本机存储不可用，记录未保存', icon: 'none', duration: 3000 });
    }
  },

  _nowText: function () {
    var d = new Date();
    function p(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' +
           p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  },

  onShareAppMessage: function () {
    return { title: '方位分金罗盘 · 传统方位测量工具', path: '/pages/live/index' };
  }
});
