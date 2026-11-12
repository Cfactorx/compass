/* =====================================================================
 * 术语对照与算法说明页
 *
 * 对照表数据全部由 utils/terms.js 派生，保证「关于页展示的对照关系」
 * 与实际判读时使用的映射完全一致（单一事实来源）。
 * ===================================================================== */
'use strict';
var T = require('../../utils/terms.js');

var ATTR_ORDER = ['旺', '相', '孤', '虚', '空亡'];
var FORTUNE_ORDER = ['旺', '相', '泄', '囚', '死'];

Page({
  data: {
    attrTable: [],
    fortuneTable: []
  },

  onLoad: function () {
    this.setData({
      attrTable: ATTR_ORDER.map(function (k) {
        return { old: k, now: T.ATTR_NEUTRAL[k], desc: T.ATTR_DESC[k] };
      }),
      fortuneTable: FORTUNE_ORDER.map(function (k) {
        return { old: k, now: T.FORTUNE_NEUTRAL[k] };
      })
    });
  },

  onShareAppMessage: function () {
    return { title: '方位分金罗盘 · 术语对照与算法说明', path: '/pages/live/index' };
  }
});
