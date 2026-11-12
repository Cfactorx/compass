/* =====================================================================
 * compass.js — 方向传感器封装（wx.startCompass 替代 DeviceOrientationEvent）
 *
 * 与 H5 版本的关键差异：
 *   - H5：window.addEventListener('deviceorientationabsolute'|'deviceorientation')
 *         + iOS 需 DeviceOrientationEvent.requestPermission()
 *   - 小程序：wx.startCompass() + wx.onCompassChange(cb)
 *         无需用户授权弹窗（指南针 API 不在隐私接口清单内），
 *         也无需 iOS 权限分支 —— 这是移植中"复杂度大幅下降"的一处
 *
 * 语义对齐：
 *   res.direction = 设备顶部朝向相对磁北的顺时针夹角（0~360）
 *   H5 中 heading = norm(360 − alpha) 亦为该值，故直接取用，无需换算。
 *
 * 失败降级：设备无磁力计（部分模拟器/低端机型）→ status='none'
 *           页面切到手动滑杆模式，功能不中断。
 * ===================================================================== */
'use strict';

var running = false;
var handler = null;

/* 启动监听。onData(direction, accuracy) 每帧回调；onFail(reason) 失败回调 */
function start(onData, onFail) {
  stop();
  handler = function (res) {
    var d = res && res.direction;
    /* 与 H5 P0-4 修复一致：NaN / null 守卫，丢弃脏数据防止罗盘永久冻结 */
    if (d == null || isNaN(d)) return;
    onData(((d % 360) + 360) % 360, res.accuracy);
  };
  try {
    wx.startCompass({
      fail: function (err) {
        running = false;
        if (onFail) onFail((err && err.errMsg) || 'startCompass failed');
      }
    });
    wx.onCompassChange(handler);
    running = true;
    return true;
  } catch (e) {
    running = false;
    if (onFail) onFail(e.message || 'compass unavailable');
    return false;
  }
}

function stop() {
  if (handler) {
    try { wx.offCompassChange(handler); } catch (e) { /* ignore */ }
    handler = null;
  }
  if (running) {
    try { wx.stopCompass({ fail: function () {} }); } catch (e) { /* ignore */ }
  }
  running = false;
}

function isRunning() { return running; }

/* 传感器精度描述（accuracy 单位：度，数值越小越好）
 * 注意：不同平台 accuracy 语义不完全一致，此处仅作粗粒度提示，阈值取保守值 */
function accuracyLevel(accuracy) {
  if (typeof accuracy !== 'number' || isNaN(accuracy)) return 'unknown';
  if (accuracy <= 15) return 'good';
  if (accuracy <= 35) return 'fair';
  return 'poor';
}

module.exports = {
  start: start,
  stop: stop,
  isRunning: isRunning,
  accuracyLevel: accuracyLevel
};
