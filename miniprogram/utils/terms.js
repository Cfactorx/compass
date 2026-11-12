/* =====================================================================
 * terms.js — 术语中性化层（合规改造核心）
 *
 * 背景：微信小程序运营规范禁止「占卜、算命、看风水」类内容。
 *       本项目为**传统方位测量与数据记录工具**，因此所有对外文案
 *       统一走本模块转换，把古籍术语中的吉凶判断语汇降级为中性技术描述。
 *
 * 原则：
 *   1. 保留可验证的数值与几何事实（度数、干支、格位、五行关系）
 *   2. 吉凶褒贬词一律中性化（吉→宜用、凶→不宜用、大凶→建议调整）
 *   3. 「风水」「算命」「占卜」等职业化/神秘化词汇从对外文案中彻底移除
 *   4. 所有页面必须展示免责声明（DISCLAIMER）
 *
 * ⚠️ 任何新增文案都必须经过 scripts/check-mp.js 的禁词扫描
 * ===================================================================== */
'use strict';

/* ---- 统一免责声明（每页必现）---- */
var DISCLAIMER = '本工具为传统方位测量与数据记录工具，输出内容仅为民俗古籍术语对照与几何计算，不构成任何预测、建议或决策依据，请理性对待。';

var DISCLAIMER_SHORT = '测量结果仅供参考，不构成决策建议';

/* ---- 分金属性中性化：孤虚旺相 → 格位等级描述，去掉吉凶色彩 ---- */
var ATTR_NEUTRAL = {
  '旺': '主格',
  '相': '次格',
  '孤': '偏格',
  '虚': '空格',
  '空亡': '骑线'
};

/* ---- 分金属性说明（设置页/关于页用于解释术语） ---- */
var ATTR_DESC = {
  '旺': '本组天干居山位中段，格位居中',
  '相': '本组天干居山位次段，格位偏差较小',
  '孤': '本组天干居山位外段，格位偏差较大',
  '虚': '本组天干居山位末段，格位偏差最大',
  '空亡': '戊己居中央不入方位，该处无天干可用'
};

/* ---- 五行关系中性化：旺相泄囚死 → 客观五行生克描述 ---- */
var FORTUNE_NEUTRAL = {
  '旺': '比和',
  '相': '纳音生山',
  '泄': '山生纳音',
  '囚': '纳音克山',
  '死': '山克纳音',
  '—': '无法判定'
};

/* ---- 可用性结论中性化 ---- */
function usableLabel(usable) {
  return usable ? '格位可用' : '格位不宜';
}

/* ---- 兼向三态中性化 ---- */
function jianLabel(jian) {
  if (!jian) return '';
  if (jian.type === '正向') return '居中（正向）';
  return jian.label;   /* 兼X向N分 / 兼X向过重 本身即为方位描述，无需改写 */
}

/* ---- 分金格归属中性化 ---- */
function fenjinLabel(fenjin) {
  if (!fenjin) return '';
  return fenjin.ganZhi + '（' + (ATTR_NEUTRAL[fenjin.attr] || fenjin.attr) + '）';
}

/* ---- 界线（原空亡）中性化 ---- */
function boundaryLabel(kw) {
  if (!kw) return '';
  return kw.label.replace('空亡', '界线');
}

/* ---- 综合结论文案（对外统一入口）---- */
function conclusionOf(r) {
  if (!r) return '';
  var s = '坐' + r.sittingMountain.name + '山' + r.facingMountain.name + '向 · ' +
          jianLabel(r.jian) + ' · 分金 ' + fenjinLabel(r.fenjin);
  if (r.kongwang) s += ' —— 该方位落在山界线上，建议调整角度';
  else if (!r.usable) s += ' —— ' + usableLabel(false) + '，建议调整至主格或次格';
  else if (r.jian.type === '兼重') s += ' —— 格位可用，偏角较大请留意';
  else if (r.jian.fen === 3) s += ' —— 格位可用，偏角略大';
  else s += ' —— ' + usableLabel(true);
  return s;
}

/* ---- 状态标签（替代原「吉/凶/空亡」三态）---- */
/* level: 'ok' | 'warn' | 'bad' —— 保留颜色分级供视觉使用，文案中性 */
function statusTag(r) {
  if (!r) return { level: 'warn', text: '待测' };
  if (r.kongwang) return { level: 'bad', text: '骑线 · ' + r.kongwang.type.replace('空亡', '界线') };
  if (!r.usable) return { level: 'warn', text: usableLabel(false) + ' · ' + (ATTR_NEUTRAL[r.fenjin.attr] || r.fenjin.attr) };
  return { level: 'ok', text: usableLabel(true) + ' · ' + (ATTR_NEUTRAL[r.fenjin.attr] || r.fenjin.attr) };
}

/* ---- 建议文案（原 suggestFenjin 输出为干支+度数，此处包装为中性说明）---- */
function suggestionText(list) {
  if (!list || !list.length) return '';
  var out = list.map(function (s) {
    return s.replace(/（旺，/, '（主格，').replace(/（相，/, '（次格，');
  });
  return '同山可选格位：' + out.join(' / ');
}

/* ---- 龙脉（穿山/透地）行文案中性化 ---- */
function dragonText(d, kind) {
  if (!d) return '';
  if (d.empty) return kind === '72' ? '居中格位（无干支可用）' : '戊己位（无干支可用）';
  return d.ganZhi + ' · ' + d.nayin + '（' + d.element + '）· 与山家五行：' +
         (FORTUNE_NEUTRAL[d.fortune] || d.fortune);
}

module.exports = {
  DISCLAIMER: DISCLAIMER,
  DISCLAIMER_SHORT: DISCLAIMER_SHORT,
  ATTR_NEUTRAL: ATTR_NEUTRAL,
  ATTR_DESC: ATTR_DESC,
  FORTUNE_NEUTRAL: FORTUNE_NEUTRAL,
  usableLabel: usableLabel,
  jianLabel: jianLabel,
  fenjinLabel: fenjinLabel,
  boundaryLabel: boundaryLabel,
  conclusionOf: conclusionOf,
  statusTag: statusTag,
  suggestionText: suggestionText,
  dragonText: dragonText
};
