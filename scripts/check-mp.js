#!/usr/bin/env node
/* =====================================================================
 * check-mp.js — 小程序工程静态自检（合规 + 结构 + 一致性）
 *
 * 用法：
 *   node scripts/check-mp.js              # 扫描 miniprogram/
 *   node scripts/check-mp.js --selftest   # 反向验证：构造已知缺陷夹具，
 *                                         # 断言检查器确实报错（防止恒通过假阳性）
 *
 * 检查项：
 *   C1  app.json pages ↔ 磁盘文件齐全
 *   C2  usingComponents 路径可达
 *   C3  WXML 事件绑定的处理函数在对应 .js 中存在
 *   C4  WXSS 禁止本地图片 url()（真机不显示）
 *   C5  合规禁词扫描（去注释后扫描；generated engine.js 除外，见 C5b）
 *   C5b 小程序业务代码禁止读取 analyze 的 advice/conclusion 原文
 *   C6  每页必须引用免责声明组件
 *   C7  require 路径不得越出小程序根
 *   C8  WXML 不得使用小程序不支持的 HTML 标签
 *   C9  JS 不得使用浏览器专属全局
 *   C10 禁止联网 API（隐私承诺：零上传）+ getLocation 必须声明
 *   C11 tabBar.pagePath 必须在 pages 中
 *   C12 utils/engine.js 必须与 assets/part1.html 引擎同源
 *   C13 所有 .js 必须通过语法解析（vm.Script，只解析不执行）
 *   C14 WXML 标签必须闭合平衡、属性引号必须配对
 * ===================================================================== */
'use strict';
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.resolve(__dirname, '..');
var MP = path.join(ROOT, 'miniprogram');

/* ---------- 常量 ---------- */
var BANNED = [
  '风水', '算命', '占卜', '卜卦', '算卦', '看相', '批八字', '八字', '紫微',
  '开光', '转运', '招财', '辟邪', '驱邪', '镇宅', '化解', '消灾', '祈福',
  '法事', '符咒', '法阵', '阴宅', '阳宅', '龙穴', '点穴', '寻龙',
  '大师', '灵验', '灵签', '求签', '改运', '改命', '姻缘', '桃花运',
  '吉凶', '大凶', '大吉', '凶吉', '宜忌'
];
/* 小程序不支持的 HTML 标签。
 * 注意：input / button / form / label / image / text / view 等是小程序真实内置组件，
 * 绝不在此列；img 不是（必须写 <image>）。 */
var BAD_TAGS = ['div', 'span', 'p', 'b', 'i', 'u', 'em', 'strong', 'small', 'br',
  'hr', 'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'tr', 'td', 'th', 'a',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'article', 'header', 'footer',
  'nav', 'main', 'aside', 'iframe', 'img'];

/* 浏览器专属全局。requestAnimationFrame 用正则单独处理：
 * canvas.requestAnimationFrame() 是小程序合法 API，不能被误伤。 */
var BROWSER_GLOBALS = [
  { re: /\bwindow\s*\./, name: 'window.' },
  { re: /\bdocument\s*\./, name: 'document.' },
  { re: /\blocalStorage\b/, name: 'localStorage' },
  { re: /\bsessionStorage\b/, name: 'sessionStorage' },
  { re: /\bnavigator\s*\./, name: 'navigator.' },
  { re: /\bDeviceOrientationEvent\b/, name: 'DeviceOrientationEvent' },
  { re: /(^|[^.\w])requestAnimationFrame\s*\(/, name: 'requestAnimationFrame()' },
  { re: /(^|[^.\w])alert\s*\(/, name: 'alert()' }
];

/* 禁止读取引擎原文（应统一走 terms.conclusionOf）。
 * 只针对本工程中 analyze 结果变量名 r，避免误伤记录对象的 o.conclusion。 */
var ENGINE_RAW_PROPS = [/\br\.advice\b/, /\br\.conclusion\b/];

var NET_APIS = ['wx.request', 'wx.uploadFile', 'wx.downloadFile', 'wx.connectSocket'];

/* 生成文件：由 build-mp-engine.js 产出，禁词扫描豁免（见 C5b 的替代约束） */
var GENERATED = ['utils/engine.js'];

/* ---------- 工具 ---------- */
function read(p) { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } }
function exists(p) { try { return fs.statSync(p).isFile(); } catch (e) { return false; } }
function walk(dir, out) {
  out = out || [];
  var ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
  ents.forEach(function (e) {
    var p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  });
  return out;
}
/* 去注释：JS 块注释/行注释、WXML 注释。避免"注释里写了禁词"造成误报 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
}
function rel(p) { return path.relative(MP, p).split(path.sep).join('/'); }

/* =====================================================================
 * 扫描主体
 * ===================================================================== */
function scan(root) {
  var errors = [], warnings = [], stats = { pages: 0, files: 0, handlers: 0, checks: 0 };
  function err(check, msg) { errors.push({ check: check, msg: msg }); }
  function warn(check, msg) { warnings.push({ check: check, msg: msg }); }

  var appJsonPath = path.join(root, 'app.json');
  var appJsonRaw = read(appJsonPath);
  var appJson = null;
  if (!appJsonRaw) { err('C1', '缺少 app.json'); return { errors: errors, warnings: warnings, stats: stats }; }
  try { appJson = JSON.parse(appJsonRaw); }
  catch (e) { err('C1', 'app.json 不是合法 JSON：' + e.message); return { errors: errors, warnings: warnings, stats: stats }; }

  var pages = appJson.pages || [];
  stats.pages = pages.length;
  var allFiles = walk(root);
  stats.files = allFiles.length;

  /* ---- C1 pages 文件齐全 ---- */
  pages.forEach(function (p) {
    ['js', 'wxml'].forEach(function (ext) {
      if (!exists(path.join(root, p + '.' + ext))) {
        err('C1', 'pages 声明了 ' + p + '，但缺少 ' + p + '.' + ext);
      }
    });
    ['json', 'wxss'].forEach(function (ext) {
      if (!exists(path.join(root, p + '.' + ext))) {
        warn('C1', p + '.' + ext + ' 不存在（可接受，但建议补齐）');
      }
    });
  });
  stats.checks++;

  /* ---- C11 tabBar ---- */
  var tab = (appJson.tabBar && appJson.tabBar.list) || [];
  tab.forEach(function (t) {
    if (pages.indexOf(t.pagePath) < 0) {
      err('C11', 'tabBar.pagePath "' + t.pagePath + '" 未在 pages 中声明');
    }
  });
  if (!tab.length) warn('C11', '未配置 tabBar');
  stats.checks++;

  /* ---- C10 禁止联网 API（「零上传」隐私承诺）---- */
  var allJs = allFiles.filter(function (f) { return f.endsWith('.js'); });
  stats.checks++;

  /* ---- C15 地理位置接口准入（微信 61040 上传阻断项）----
   * 微信自 2022-07-14 起对下列 8 个地理位置接口实行准入制：
   * 代码里出现该调用而 AppID 未获对应权限时，上传/提交审核直接报 61040。
   * 本工程的设计前提是「不申请设备定位」，位置一律由用户显式指定，
   * 因此这里做强禁止：JS 不得调用，app.json 不得声明。
   * 详见 utils/geo.js 头部注释。 */
  var LOCATION_APIS = ['getLocation', 'getFuzzyLocation', 'onLocationChange',
    'offLocationChange', 'startLocationUpdate', 'stopLocationUpdate',
    'startLocationUpdateBackground', 'chooseLocation', 'choosePoi', 'openLocation'];
  allJs.forEach(function (f) {
    var src = stripComments(read(f) || '');
    LOCATION_APIS.forEach(function (api) {
      var re = new RegExp('wx\\.' + api + '\\s*\\(');
      if (re.test(src)) {
        err('C15', rel(f) + ' 调用了地理位置接口 wx.' + api +
            '()。该接口受微信准入制管控，未获权限会导致上传报 61040。' +
            '本工程设计为不使用设备定位，请改用「地图准星 / 手动输入坐标」指定测量位置');
      }
    });
  });
  var rpi2 = appJson.requiredPrivateInfos;
  if (rpi2 && rpi2.length) {
    err('C15', 'app.json 声明了 requiredPrivateInfos: ' +
        JSON.stringify(rpi2) + '。本工程不使用地理位置接口，该声明会触发微信 61040 校验，请删除');
  }
  if (appJson.permission && appJson.permission['scope.userLocation']) {
    err('C15', 'app.json 声明了 permission["scope.userLocation"]，与「不使用设备定位」的设计冲突，请删除');
  }
  var wxmlLoc = allFiles.filter(function (f) { return f.endsWith('.wxml'); });
  wxmlLoc.forEach(function (f) {
    var src = read(f) || '';
    /* show-location 会请求定位能力，同样需要地理位置权限 */
    if (/\bshow-location\s*=/.test(src)) {
      err('C15', rel(f) + ' 的 <map> 使用了 show-location，会请求定位能力；' +
          '本工程不使用设备定位，请移除该属性');
    }
  });
  stats.checks++;

  /* ---- C2..C4、C8、C9、C6 逐文件扫描 ---- */
  var wxmlFiles = allFiles.filter(function (f) { return f.endsWith('.wxml'); });
  var jsFiles = allJs;
  var wxssFiles = allFiles.filter(function (f) { return f.endsWith('.wxss'); });

  /* C4 WXSS 本地图片 */
  wxssFiles.forEach(function (f) {
    var src = stripComments(read(f) || '');
    var re = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g, m;
    while ((m = re.exec(src))) {
      var u = m[1].trim();
      if (/^(data:|https?:|\/\/)/.test(u)) continue;
      err('C4', rel(f) + ' 使用了本地图片 url(' + u + ')。WXSS 真机不支持本地路径，请改用 <image> 标签或网络图/base64');
    }
  });
  stats.checks++;

  /* C8 WXML 标签 + C6 免责声明 */
  wxmlFiles.forEach(function (f) {
    var src = stripComments(read(f) || '');
    BAD_TAGS.forEach(function (tag) {
      var re = new RegExp('<' + tag + '(?=[\\s/>])', 'i');
      if (re.test(src)) {
        err('C8', rel(f) + ' 使用了小程序不支持的标签 <' + tag + '>');
      }
    });
    stats.checks++;
  });

  /* C6 每页必须含免责声明 */
  pages.forEach(function (p) {
    var wxml = read(path.join(root, p + '.wxml')) || '';
    var jsonRaw = read(path.join(root, p + '.json')) || '{}';
    var j = null;
    try { j = JSON.parse(jsonRaw); } catch (e) { err('C2', p + '.json 不是合法 JSON'); }
    var uc = (j && j.usingComponents) || {};
    var hasDisclaimerRef = false;
    Object.keys(uc).forEach(function (k) {
      if (String(uc[k]).indexOf('components/disclaimer') >= 0) hasDisclaimerRef = true;
    });
    if (!hasDisclaimerRef) {
      err('C6', p + ' 未在 usingComponents 中注册免责声明组件');
    }
    if (!/<disclaimer[\s/>]/.test(wxml)) {
      err('C6', p + ' 的 WXML 未引用 <disclaimer> 组件');
    }
  });
  stats.checks++;

  /* C2 usingComponents 路径可达 */
  allFiles.filter(function (f) { return f.endsWith('.json') && f.indexOf('project.config') < 0; })
    .forEach(function (f) {
      var j; try { j = JSON.parse(read(f) || '{}'); } catch (e) { return; }
      var uc = j.usingComponents || {};
      Object.keys(uc).forEach(function (name) {
        var target = String(uc[name]);
        var abs = target.startsWith('/')
          ? path.join(root, target)
          : path.resolve(path.dirname(f), target);
        if (!exists(abs + '.js') || !exists(abs + '.wxml')) {
          err('C2', rel(f) + ' 的组件 "' + name + '" 指向 ' + target + '，但文件不存在');
        }
      });
    });
  stats.checks++;

  /* C3 事件处理函数存在 */
  wxmlFiles.forEach(function (f) {
    var src = read(f) || '';
    var jsPath = f.replace(/\.wxml$/, '.js');
    var js = read(jsPath);
    if (!js) return;
    var re = /\b(?:bind|catch|capture-bind|capture-catch)[:]?([a-zA-Z]+)\s*=\s*"([^"{}]+)"/g, m;
    var seen = {};
    while ((m = re.exec(src))) {
      var h = m[2].trim();
      if (!h || seen[h]) continue;
      seen[h] = true;
      stats.handlers++;
      var ok = new RegExp('(^|[\\s,{]|["\'])' + h + '\\s*[:(]').test(js);
      if (!ok) {
        err('C3', rel(f) + ' 绑定了 ' + m[0].slice(0, 40) + '，但 ' + rel(jsPath) + ' 中找不到处理函数 ' + h + '()');
      }
    }
  });
  stats.checks++;

  /* C7 require 越界 + C9 浏览器全局 + C10 联网 + C5b advice/conclusion */
  jsFiles.forEach(function (f) {
    var isEngine = GENERATED.indexOf(rel(f)) >= 0;
    var raw = read(f) || '';
    var src = stripComments(raw);

    /* C7 */
    var re = /require\(\s*['"]([^'"]+)['"]\s*\)/g, m;
    while ((m = re.exec(src))) {
      var spec = m[1];
      if (spec.charAt(0) !== '.') {
        warn('C7', rel(f) + ' 引用了非相对模块 "' + spec + '"（本工程为零依赖设计，请确认）');
        continue;
      }
      var abs = path.resolve(path.dirname(f), spec);
      if (path.relative(root, abs).startsWith('..')) {
        err('C7', rel(f) + ' 的 require("' + spec + '") 越出小程序根目录');
      }
    }

    /* C9 / C10 / C5b：生成文件已由 build-mp-engine.js 单独硬校验，跳过重复告警 */
    if (isEngine) { stats.checks++; return; }

    BROWSER_GLOBALS.forEach(function (g) {
      if (g.re.test(src)) {
        err('C9', rel(f) + ' 使用了浏览器专属 API "' + g.name + '"，小程序不支持（画布动画请用 canvas.requestAnimationFrame）');
      }
    });
    NET_APIS.forEach(function (g) {
      if (src.indexOf(g) >= 0) {
        err('C10', rel(f) + ' 调用了联网 API "' + g + '"，违反「零上传」隐私承诺');
      }
    });
    /* C5b：禁止读取 analyze 结果里的 advice / conclusion 原文（含褒贬用语），
       必须统一经 terms.conclusionOf() 中性化后再展示 */
    if (src.indexOf('conclusionOf') < 0) {
      ENGINE_RAW_PROPS.forEach(function (re2) {
        if (re2.test(src)) {
          err('C5b', rel(f) + ' 直接读取了引擎原文 ' + re2.source +
              '，应改用 terms.conclusionOf(r) 中性化后再展示');
        }
      });
    }
    stats.checks++;
  });

  /* ---- C5 禁词扫描 ---- */
  var textFiles = allFiles.filter(function (f) {
    if (GENERATED.indexOf(rel(f)) >= 0) return false;
    return /\.(js|json|wxml|wxss)$/.test(f);
  });
  textFiles.forEach(function (f) {
    var src = stripComments(read(f) || '');
    BANNED.forEach(function (w) {
      var idx = src.indexOf(w);
      if (idx < 0) return;
      var line = src.slice(0, idx).split('\n').length;
      err('C5', rel(f) + ':' + line + ' 出现合规禁词「' + w + '」');
    });
    stats.checks++;
  });

  /* ---- C12 引擎同源 ---- */
  var srcHtml = read(path.join(ROOT, 'assets', 'part1.html'));
  var gen = read(path.join(root, 'utils', 'engine.js'));
  if (srcHtml && gen) {
    var i0 = srcHtml.indexOf('/*ENGINE-START*/');
    var i1 = srcHtml.indexOf('/*ENGINE-END*/');
    if (i0 >= 0 && i1 > i0) {
      var body = srcHtml.slice(i0 + 16, i1).trim();
      if (gen.indexOf(body) < 0) {
        err('C12', 'utils/engine.js 与 assets/part1.html 引擎不同源，请运行 npm run build:mp');
      }
    } else {
      err('C12', 'assets/part1.html 缺少 ENGINE-START/END 标记');
    }
  } else {
    err('C12', '无法读取引擎源文件或生成文件');
  }
  stats.checks++;

  /* ---- C13 JS 语法解析 ---- */
  jsFiles.forEach(function (f) {
    try { new vm.Script(read(f) || '', { filename: f }); }
    catch (e) { err('C13', rel(f) + ' 语法错误：' + e.message); }
    stats.checks++;
  });

  /* ---- C14 WXML 标签平衡 ---- */
  wxmlFiles.forEach(function (f) {
    var src = (read(f) || '').replace(/<!--[\s\S]*?-->/g, '');
    var re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g, m;
    var stack = [], lineNo = 1, last = 0, bad = null;
    while ((m = re.exec(src))) {
      lineNo += (src.slice(last, m.index).match(/\n/g) || []).length;
      last = m.index;
      var closing = m[1] === '/', tag = m[2], selfClose = m[4] === '/';
      if (closing) {
        if (!stack.length || stack[stack.length - 1].tag !== tag) {
          bad = '第 ' + lineNo + ' 行 </' + tag + '> 与未闭合的 <' +
                (stack.length ? stack[stack.length - 1].tag : '无') + '> 不匹配';
          break;
        }
        stack.pop();
      } else if (!selfClose) {
        stack.push({ tag: tag, line: lineNo });
      }
    }
    if (!bad && stack.length) {
      bad = '标签未闭合：<' + stack[stack.length - 1].tag + '>（第 ' +
            stack[stack.length - 1].line + ' 行）';
    }
    /* 属性引号配对（粗检：不以 > 结尾的疑似截断） */
    if (!bad) {
      var openQ = (src.match(/="/g) || []).length, closeQ = (src.match(/"/g) || []).length;
      if (closeQ % 2 !== 0) bad = '双引号数量为奇数（' + closeQ + ' 个），可能存在属性引号未闭合';
      else if (openQ * 2 !== closeQ) bad = '属性引号配对异常：=" 出现 ' + openQ + ' 次，双引号共 ' + closeQ + ' 个';
    }
    if (bad) err('C14', rel(f) + ' ' + bad);
    stats.checks++;
  });

  return { errors: errors, warnings: warnings, stats: stats };
}

/* =====================================================================
 * 反向验证：构造一批「已知有缺陷」的夹具，断言检查器确实全部报出。
 * 这一步是为了防止「检查器恒通过」的假阳性——如果某个检查项失效，
 * 自检会失败并明确指出来。
 * ===================================================================== */
function selftest() {
  var os = require('os');
  var base = fs.mkdtempSync(path.join(os.tmpdir(), 'mpcheck-'));
  var root = path.join(base, 'miniprogram');
  fs.mkdirSync(path.join(root, 'pages', 'bad'), { recursive: true });
  fs.mkdirSync(path.join(root, 'utils'), { recursive: true });
  fs.mkdirSync(path.join(root, 'components', 'disclaimer'), { recursive: true });

  fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify({
    pages: ['pages/bad/index', 'pages/missing/index'],
    tabBar: { list: [{ pagePath: 'pages/notdeclared/index', text: 'X' }] },
    permission: { 'scope.userLocation': { desc: 'x' } },
    requiredPrivateInfos: ['getLocation']
  }, null, 2));

  /* 页面：集齐各类缺陷 */
  fs.writeFileSync(path.join(root, 'pages', 'bad', 'index.json'), JSON.stringify({
    usingComponents: { foo: '/components/nothere/index' }
  }));
  fs.writeFileSync(path.join(root, 'pages', 'bad', 'index.wxml'), [
    '<div class="x">用 div 而不是 view</div>',
    '<b>粗体</b>',
    '<view bindtap="onNotExist">点我</view>',
    '<map show-location="{{true}}"></map>',
    '<view>本页面提供风水服务',
    '<view>标签未闭合的第二个缺陷'
  ].join('\n'));
  fs.writeFileSync(path.join(root, 'pages', 'bad', 'index.wxss'),
    '.a{background-image:url(./local.png)}');
  fs.writeFileSync(path.join(root, 'pages', 'bad', 'index.js'), [
    "var x = require('../../../outside/module.js');",
    "var y = localStorage.getItem('a');",
    "wx.request({ url: 'https://example.com' });",
    "wx.getLocation({ type: 'gcj02' });",
    "var w = document.body;",
    "Page({ onLoad: function(){}, onReal: function(){} });"
  ].join('\n'));
  /* C13 夹具：故意写坏的语法 */
  fs.writeFileSync(path.join(root, 'utils', 'broken.js'),
    'function ( { return 1; }\n');

  /* 组件占位，让 C2 只报「nothere」这一条 */
  ['index.js', 'index.wxml'].forEach(function (n) {
    fs.writeFileSync(path.join(root, 'components', 'disclaimer', n), '/*x*/');
  });

  var res = scan(root);
  var got = {};
  res.errors.forEach(function (e) { got[e.check] = (got[e.check] || 0) + 1; });

  var EXPECT = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8', 'C9', 'C10', 'C11',
                'C13', 'C14', 'C15'];
  var missing = EXPECT.filter(function (c) { return !got[c]; });

  try { fs.rmSync(base, { recursive: true, force: true }); } catch (e) { /* ignore */ }

  console.log('[check-mp --selftest] 夹具检出统计：');
  EXPECT.forEach(function (c) {
    console.log('  ' + (got[c] ? '✓' : '✗') + ' ' + c + '  命中 ' + (got[c] || 0) + ' 条');
  });
  if (missing.length) {
    console.error('\n[check-mp --selftest] ✗ 反向验证失败：以下检查项未能在缺陷夹具上报错 → ' + missing.join(', '));
    console.error('  说明这些检查项已失效（恒通过假阳性），必须先修复检查器。');
    process.exit(1);
  }
  console.log('\n[check-mp --selftest] ✓ 反向验证通过：' + EXPECT.length + '/' + EXPECT.length +
              ' 个检查项均在缺陷夹具上正确报错（非恒通过）');
}

/* =====================================================================
 * 主流程
 * ===================================================================== */
if (process.argv.indexOf('--selftest') >= 0) {
  selftest();
} else {
  var r = scan(MP);
  console.log('[check-mp] 扫描 ' + rel(MP) + '/：' + r.stats.pages + ' 个页面、' +
              r.stats.files + ' 个文件、' + r.stats.handlers + ' 个事件绑定\n');
  if (r.warnings.length) {
    console.log('警告 ' + r.warnings.length + ' 条：');
    r.warnings.forEach(function (w) { console.log('  ⚠ [' + w.check + '] ' + w.msg); });
    console.log('');
  }
  if (r.errors.length) {
    console.error('错误 ' + r.errors.length + ' 条：');
    r.errors.forEach(function (e) { console.error('  ✗ [' + e.check + '] ' + e.msg); });
    console.error('\n[check-mp] ✗ 自检未通过');
    process.exit(1);
  }
  console.log('[check-mp] ✓ C1–C15 全部检查项通过（无错误、' + r.warnings.length + ' 条警告）');
}
