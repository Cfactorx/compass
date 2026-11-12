/* =====================================================================
 * disclaimer — 统一免责声明组件
 * 合规要求：所有涉及判读结果的页面必须展示本组件。
 * 请勿在页面内自行硬编码免责文案，统一走本组件以保证文案一致。
 * ===================================================================== */
'use strict';
var T = require('../../utils/terms.js');

Component({
  properties: {
    /* short = 单行简版（页面底部）；full = 完整版（关于页） */
    variant: {
      type: String,
      value: 'short'
    }
  },
  data: {
    text: ''
  },
  lifetimes: {
    attached: function () {
      this.setData({
        text: this.data.variant === 'full' ? T.DISCLAIMER : T.DISCLAIMER_SHORT
      });
    }
  }
});
