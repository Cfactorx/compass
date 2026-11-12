/* =====================================================================
 * 测量记录页
 *
 * 数据迁移（沿用 H5 V1.5 P0-3）：V1.4 起「手工排盘」模式已合并到
 * 「地图量测」，旧记录中的 mode:'pan' 在读取时自动归类为 'map' 并回写。
 * ===================================================================== */
'use strict';
var store = require('../../utils/store.js');

var MODE_TEXT = { live: '实地罗盘', map: '地图量测', pan: '地图量测', manual: '手动转盘' };

/* 地图记录的附加行：向方真北 + 线长 */
function extraTextOf(rec) {
  var x = rec.extra;
  if (!x || x.distM == null) return '';
  return '向方真北 ' + x.trueBearing + '° · 线长 ' +
         (x.distM >= 1000 ? (x.distM / 1000).toFixed(2) + ' km' : x.distM + ' m');
}

Page({
  data: { list: [] },

  onShow: function () {
    this._load();
  },

  _load: function () {
    var raw = store.loadRecords();
    var migrated = false;
    var list = raw.map(function (o) {
      if (o.mode === 'pan') { o.mode = 'map'; migrated = true; }
      return {
        id: o.id,
        ts: o.ts,
        modeText: MODE_TEXT[o.mode] || '测量',
        conclusion: o.conclusion,
        sittingDeg: o.sittingDeg,
        declText: (o.decl != null)
          ? ' · 磁偏角 ' + (o.decl >= 0 ? '+' : '') + o.decl + '°'
          : '',
        extraText: extraTextOf(o),
        source: o.source || ''
      };
    });
    if (migrated) {
      /* 回写迁移结果，避免每次进入都重复迁移 */
      try { wx.setStorageSync('lp_records', raw); } catch (e) { /* ignore */ }
    }
    /* 倒序：最新在前 */
    list.reverse();
    this._raw = raw;
    this.setData({ list: list });
  },

  onView: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    var it = (this._raw || []).filter(function (x) { return x.id === id; })[0];
    if (!it) return;
    var lines = [
      '时间：' + it.ts,
      '模式：' + (MODE_TEXT[it.mode] || '测量'),
      '',
      it.conclusion,
      '',
      '坐方度数：' + it.sittingDeg + '°',
      '分金：' + (it.fenjin || '—') + '（' + (it.attr || '—') + '）',
      '磁偏角：' + (it.decl != null ? ((it.decl >= 0 ? '+' : '') + it.decl + '°') : '未定位')
    ];
    if (it.extra) {
      lines.push('坐点 GCJ-02：' + it.extra.sit[0] + ', ' + it.extra.sit[1]);
      lines.push('向点 GCJ-02：' + it.extra.face[0] + ', ' + it.extra.face[1]);
      lines.push('向方真北：' + it.extra.trueBearing + '°');
      lines.push('向方磁北：' + it.extra.magneticBearing + '°');
      lines.push('两点距离：' + it.extra.distM + ' m');
    }
    wx.showModal({
      title: '记录详情',
      content: lines.join('\n'),
      confirmText: '复制',
      cancelText: '关闭',
      success: function (r) {
        if (r.confirm) {
          wx.setClipboardData({ data: lines.join('\n') });
        }
      }
    });
  },

  onDelete: function (e) {
    var id = Number(e.currentTarget.dataset.id);
    var that = this;
    wx.showModal({
      title: '删除记录',
      content: '确定删除这条测量记录？删除后不可恢复。',
      confirmColor: '#C2402A',
      success: function (r) {
        if (!r.confirm) return;
        store.removeRecord(id);
        that._load();
        wx.showToast({ title: '已删除', icon: 'success' });
      }
    });
  },

  onClearAll: function () {
    var that = this;
    if (!this.data.list.length) return;
    wx.showModal({
      title: '清空全部记录',
      content: '将删除本机全部 ' + this.data.list.length + ' 条测量记录，此操作不可恢复。',
      confirmColor: '#C2402A',
      success: function (r) {
        if (!r.confirm) return;
        try { wx.setStorageSync('lp_records', []); } catch (e) { /* ignore */ }
        that._load();
        wx.showToast({ title: '已清空', icon: 'success' });
      }
    });
  },

  onCopyAll: function () {
    var raw = this._raw || [];
    if (!raw.length) return;
    var app = getApp();
    var head = '方位分金罗盘 · 测量记录（共 ' + raw.length + ' 条）\n' +
               app.terms.DISCLAIMER + '\n';
    var body = raw.map(function (it, i) {
      var s = '【' + (i + 1) + '】' + it.ts + ' · ' + (MODE_TEXT[it.mode] || '测量') + '\n' +
              it.conclusion + '\n' +
              '坐方 ' + it.sittingDeg + '°' +
              (it.decl != null ? ' · 磁偏角 ' + (it.decl >= 0 ? '+' : '') + it.decl + '°' : '');
      if (it.extra) {
        s += '\n向方真北 ' + it.extra.trueBearing + '° · 线长 ' + it.extra.distM + ' m';
      }
      return s;
    }).join('\n\n');
    wx.setClipboardData({
      data: head + '\n' + body,
      success: function () { wx.showToast({ title: '已复制到剪贴板', icon: 'success' }); }
    });
  },

  onShareAppMessage: function () {
    return { title: '方位分金罗盘 · 传统方位测量工具', path: '/pages/live/index' };
  }
});
