// 共享 vm context 的端到端模拟
var fs = require('fs');
var vm = require('vm');
var html = fs.readFileSync('index.html', 'utf8');
var re = /<script[^>]*>([\s\S]*?)<\/script>/g;
var blocks = [];
var m;
while ((m = re.exec(html)) !== null) blocks.push(m[1]);

var nodes = {};
function getNode(id) {
  if (!nodes[id]) {
    var n = {
      _id: id, tagName: 'div', _listeners: {}, style: {},
      classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
      dataset: {}, _value: '', _innerHTML: '', _text: '', _parent: null,
      addEventListener: function(t, fn, o) { (this._listeners[t] = this._listeners[t] || []).push({ fn: fn, opt: o }); },
      removeEventListener: function() {},
      getContext: function() { return new Proxy({}, { get: function() { return function() {}; } }); },
      getBoundingClientRect: function() { return { left: 0, top: 0, width: 300, height: 300 }; },
      querySelector: function() { return null; },
      querySelectorAll: function() { return []; },
      closest: function(sel) {
        if (!sel) return null;
        var tags = sel.split(',').map(function(s) { return s.trim().toLowerCase().replace(/^\./, '').replace(/\[.*$/, ''); });
        var cur = this;
        while (cur) {
          if (tags.indexOf(cur.tagName) >= 0) return cur;
          cur = cur._parent;
        }
        return null;
      },
      focus: function() { this._focused = true; },
      appendChild: function(c) { this._children = this._children || []; this._children.push(c); c._parent = this; return c; }
    };
    nodes[id] = n;
  }
  return nodes[id];
}

var sandbox = {
  document: { getElementById: getNode, createElement: function() { return getNode('new'); }, addEventListener: function() {}, removeEventListener: function() {}, querySelectorAll: function() { return []; }, querySelector: function() { return null; } },
  window: { addEventListener: function() {}, removeEventListener: function() {}, devicePixelRatio: 1, requestAnimationFrame: function() { return 0; }, cancelAnimationFrame: function() {}, DeviceOrientationEvent: function() {}, innerWidth: 360, innerHeight: 640 },
  navigator: { geolocation: { getCurrentPosition: function() {}, watchPosition: function() { return 0; } }, userAgent: 'test', clipboard: null },
  localStorage: { _s: {}, getItem: function(k) { return this._s[k] || null; }, setItem: function(k, v) { this._s[k] = String(v); }, removeItem: function(k) { delete this._s[k]; } },
  requestAnimationFrame: function() { return 0; },
  console: { log: function() { process.stdout.write(Array.from(arguments).map(String).join(' ') + '\n'); }, warn: function() { process.stdout.write('WARN: ' + Array.from(arguments).map(String).join(' ') + '\n'); }, error: console.error }
};
vm.createContext(sandbox);

['inpLat', 'inpLng', 'btnGoCoord', 'mapArea', 'mapLocate', 'mapZoomIn', 'mapZoomOut', 'view-live', 'view-map', 'liveCard', 'mapCard', 'sensorStrip', 'sensorText', 'sensorDot', 'chipCoord', 'chipDecl', 'compassCanvas', 'mapOverlay', 'mapTiles', 'mapHint', 'mapDegrade', 'recList', 'setBody', 'toast', 'btnRecords', 'btnSettings', 'pageRecords', 'pageSettings', 'permOverlay', 'calibOverlay', 'permBtn', 'permSkip', 'calibDone', 'recBack', 'setBack', 'manualVal', 'manualRange', 'dialBadge', 'btnCalib'].forEach(getNode);

for (var k = 0; k < blocks.length; k++) {
  try { vm.runInContext(blocks[k], sandbox); console.log('script #' + (k + 1) + ' OK'); }
  catch (e) { console.log('script #' + (k + 1) + ' ERROR: ' + e.message); }
}

console.log('--- 经纬度输入框事件注册校验 ---');
['inpLat', 'inpLng', 'btnGoCoord'].forEach(function(id) {
  var n = nodes[id];
  var pd = n._listeners.pointerdown || [];
  console.log(id + ': pointerdown listeners = ' + pd.length + (pd.length ? ' [OK stopPropagation 已注册]' : ' [FAIL]'));
});

console.log('--- 模拟用户在 inpLat 上点击 ---');
var inpLat = nodes.inpLat;
var mapArea = nodes.mapArea;
inpLat._parent = mapArea;
var areaPD = mapArea._listeners.pointerdown || [];
var prevented = false;
areaPD.forEach(function(l) {
  var ev = { target: inpLat, pointerId: 1, clientX: 50, clientY: 50, preventDefault: function() { prevented = true; }, stopPropagation: function() {}, closest: inpLat.closest.bind(inpLat) };
  try { l.fn(ev); } catch (e) { console.log('handler err: ' + e.message); }
});
console.log('area preventDefault called? ' + (prevented ? 'YES [FAIL 仍然拦截]' : 'NO [OK early-return 生效]'));
