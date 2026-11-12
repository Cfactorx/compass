/* =====================================================================
 * engine.js — 判读引擎（纯函数，零 DOM / 零平台 API 依赖）
 *
 * ⚠️ 本文件由 scripts/build-mp-engine.js 自动生成，请勿手动编辑。
 *    单一事实来源：assets/part1.html（H5 与小程序共用同一份引擎）
 *    修改步骤：改 assets/part1.html → npm run build:mp
 *
 * 生成时间：2026-10-14T04:04:12.304Z
 * ===================================================================== */

/* ============ 以下为 engine 正文（自 part1.html 自动抽取） ============ */
/* =====================================================================
 * 判读引擎（纯函数，零 DOM 依赖）
 * 模块：LUOPAN 二十四山/分金/兼向/空亡 · GEOMAG WMM2025 磁偏角
 *       GEO 坐标转换/大圆方位角 · STORE 设置与记录（纯数据变换）
 * ===================================================================== */

/* 世界地磁模型 WMM2025 系数（来源：NOAA/NCEI WMM2025 COF，经 pygeomag 包分发）
 * 每项: [n, m, g(nT), h(nT), g_dot(nT/yr), h_dot(nT/yr)] */
var WMM2025={epoch:2025,c:[[1,0,-29351.8,0,12,0],[1,1,-1410.8,4545.4,9.7,-21.5],[2,0,-2556.6,0,-11.6,0],[2,1,2951.1,-3133.6,-5.2,-27.7],[2,2,1649.3,-815.1,-8,-12.1],[3,0,1361,0,-1.3,0],[3,1,-2404.1,-56.6,-4.2,4],[3,2,1243.8,237.5,0.4,-0.3],[3,3,453.6,-549.5,-15.6,-4.1],[4,0,895,0,-1.6,0],[4,1,799.5,278.6,-2.4,-1.1],[4,2,55.7,-133.9,-6,4.1],[4,3,-281.1,212,5.6,1.6],[4,4,12.1,-375.6,-7,-4.4],[5,0,-233.2,0,0.6,0],[5,1,368.9,45.4,1.4,-0.5],[5,2,187.2,220.2,0,2.2],[5,3,-138.7,-122.9,0.6,0.4],[5,4,-142,43,2.2,1.7],[5,5,20.9,106.1,0.9,1.9],[6,0,64.4,0,-0.2,0],[6,1,63.8,-18.4,-0.4,0.3],[6,2,76.9,16.8,0.9,-1.6],[6,3,-115.7,48.8,1.2,-0.4],[6,4,-40.9,-59.8,-0.9,0.9],[6,5,14.9,10.9,0.3,0.7],[6,6,-60.7,72.7,0.9,0.9],[7,0,79.5,0,0,0],[7,1,-77,-48.9,-0.1,0.6],[7,2,-8.8,-14.4,-0.1,0.5],[7,3,59.3,-1,0.5,-0.8],[7,4,15.8,23.4,-0.1,0],[7,5,2.5,-7.4,-0.8,-1],[7,6,-11.1,-25.1,-0.8,0.6],[7,7,14.2,-2.3,0.8,-0.2],[8,0,23.2,0,-0.1,0],[8,1,10.8,7.1,0.2,-0.2],[8,2,-17.5,-12.6,0,0.5],[8,3,2,11.4,0.5,-0.4],[8,4,-21.7,-9.7,-0.1,0.4],[8,5,16.9,12.7,0.3,-0.5],[8,6,15,0.7,0.2,-0.6],[8,7,-16.8,-5.2,0,0.3],[8,8,0.9,3.9,0.2,0.2],[9,0,4.6,0,0,0],[9,1,7.8,-24.8,-0.1,-0.3],[9,2,3,12.2,0.1,0.3],[9,3,-0.2,8.3,0.3,-0.3],[9,4,-2.5,-3.3,-0.3,0.3],[9,5,-13.1,-5.2,0,0.2],[9,6,2.4,7.2,0.3,-0.1],[9,7,8.6,-0.6,-0.1,-0.2],[9,8,-8.7,0.8,0.1,0.4],[9,9,-12.9,10,-0.1,0.1],[10,0,-1.3,0,0.1,0],[10,1,-6.4,3.3,0,0],[10,2,0.2,0,0.1,0],[10,3,2,2.4,0.1,-0.2],[10,4,-1,5.3,0,0.1],[10,5,-0.6,-9.1,-0.3,-0.1],[10,6,-0.9,0.4,0,0.1],[10,7,1.5,-4.2,-0.1,0],[10,8,0.9,-3.8,-0.1,-0.1],[10,9,-2.7,0.9,0,0.2],[10,10,-3.9,-9.1,0,0],[11,0,2.9,0,0,0],[11,1,-1.5,0,0,0],[11,2,-2.5,2.9,0,0.1],[11,3,2.4,-0.6,0,0],[11,4,-0.6,0.2,0,0.1],[11,5,-0.1,0.5,-0.1,0],[11,6,-0.6,-0.3,0,0],[11,7,-0.1,-1.2,0,0.1],[11,8,1.1,-1.7,-0.1,0],[11,9,-1,-2.9,-0.1,0],[11,10,-0.2,-1.8,-0.1,0],[11,11,2.6,-2.3,-0.1,0],[12,0,-2,0,0,0],[12,1,-0.2,-1.3,0,0],[12,2,0.3,0.7,0,0],[12,3,1.2,1,0,-0.1],[12,4,-1.3,-1.4,0,0.1],[12,5,0.6,0,0,0],[12,6,0.6,0.6,0.1,0],[12,7,0.5,-0.1,0,0],[12,8,-0.1,0.8,0,0],[12,9,-0.4,0.1,0,0],[12,10,-0.2,-1,-0.1,0],[12,11,-1.3,0.1,0,0],[12,12,-0.7,0.2,-0.1,-0.1]]};

var LP = (function(){
  'use strict';
  var D2R = Math.PI/180, R2D = 180/Math.PI;

  /* ---------------- LUOPAN ---------------- */
  var MOUNTAINS = ["子","癸","丑","艮","寅","甲","卯","乙","辰","巽","巳",
                   "丙","午","丁","未","坤","申","庚","酉","辛","戌","乾","亥","壬"];
  var BRANCHES  = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  var YANG_BRANCHES = ["子","寅","辰","午","申","戌"];
  var YANG_STEMS = ["甲","丙","戊","庚","壬"];
  var YIN_STEMS  = ["乙","丁","己","辛","癸"];
  var NUM_CN = ["一","二","三"];
  var STEM_ATTR = {"丙":"旺","庚":"旺","丁":"相","辛":"相",
                   "甲":"孤","壬":"孤","乙":"虚","癸":"虚","戊":"空亡","己":"空亡"};

  function norm(d){ d = d % 360; if (d < 0) d += 360; return d; }
  function circDist(a,b){ var d = Math.abs(norm(a-b)); return d > 180 ? 360-d : d; }

  /* 干维山借顺时针方向前方最近地支山之支 */
  function branchOfMountain(i){
    var m = MOUNTAINS[i];
    if (BRANCHES.indexOf(m) >= 0) return m;
    return MOUNTAINS[(i+1) % 24];
  }

  /* 一百二十分金全表（按 TDD 三要素规则生成，120 格） */
  var FJ120 = (function(){
    var t = [];
    for (var i=0;i<24;i++){
      var b = branchOfMountain(i);
      var stems = YANG_BRANCHES.indexOf(b) >= 0 ? YANG_STEMS : YIN_STEMS;
      var start = i*15 - 7.5;
      for (var j=0;j<5;j++){
        var s = start + j*3;
        t.push({ mountainIndex:i, branch:b, stem:stems[j], ganZhi:stems[j]+b,
                 attr:STEM_ATTR[stems[j]], slot:j,
                 start:norm(s), end:norm(s+3), startRaw:s, endRaw:s+3 });
      }
    }
    return t;
  })();

  function mountainAt(deg){
    deg = norm(deg);
    var idx = Math.floor(norm(deg + 7.5) / 15);
    return { index: idx, name: MOUNTAINS[idx] };
  }

  /* 分金格查询：mode '120'（3°格）或 '240'（1.5°格，干支同父格） */
  function fenjinAt(deg, mode){
    deg = norm(deg);
    var is240 = (mode === '240');
    var mi = Math.floor(norm(deg + 7.5) / 15);
    var base = mi*15 - 7.5;
    var local = norm(deg - base);   /* norm 处理跨0°山（如359.9°属子山） */
    var cw = is240 ? 1.5 : 3;
    var nCells = is240 ? 10 : 5;
    var slot = Math.min(nCells-1, Math.floor(local/cw));
    var parent = FJ120[mi*5 + Math.min(4, Math.floor(local/3))];
    var half = is240 ? (slot % 2) : 0;
    return { ganZhi:parent.ganZhi, stem:parent.stem, attr:parent.attr,
             slot:slot, mountainIndex:mi, mountain:MOUNTAINS[mi],
             start:norm(parent.startRaw + half*1.5),
             end:norm(parent.startRaw + half*1.5 + cw),
             cellWidth:cw };
  }

  /* 同山旺相分金建议 */
  function suggestFenjin(mountainIndex){
    var out = [];
    for (var j=0;j<5;j++){
      var c = FJ120[mountainIndex*5 + j];
      if (c.attr === '旺' || c.attr === '相')
        out.push(c.ganZhi + '（' + c.attr + '，' + c.start.toFixed(1) + '°–' + c.end.toFixed(1) + '°）');
    }
    return out;
  }

  /* 空亡/骑线检测：d 为坐方度数，width 为判定宽度 */
  function kongwangAt(d, width){
    d = norm(d);
    for (var k=0;k<24;k++){
      var b = norm(7.5 + 15*k);
      var dist = circDist(d, b);
      if (dist <= width + 1e-9){
        var big = ((b % 45) === 22.5);
        return { boundary:b, dist:dist, type: big ? '大空亡' : '小空亡',
                 label:'压' + mountainAt(b-0.01).name + mountainAt(b+0.01).name +
                       '山界（' + (big?'大':'小') + '空亡）' };
      }
    }
    return null;
  }

  /* 主判读：sitDeg = 坐方度数（向方 = 坐方+180） */
  function analyze(sitDeg, opts){
    opts = opts || {};
    var width = (opts.kongwangWidth != null) ? opts.kongwangWidth : 1.5;
    var mode = opts.fenjinMode || '120';
    sitDeg = norm(sitDeg);
    var facingDeg = norm(sitDeg + 180);

    var sit = mountainAt(sitDeg);
    var face = mountainAt(facingDeg);
    var center = sit.index * 15;
    var off = circDist(sitDeg, center);
    var eastOf = norm(sitDeg - center) < 180;
    var sideSitIdx = eastOf ? (sit.index+1)%24 : (sit.index+23)%24;
    var sideSit = MOUNTAINS[sideSitIdx];
    var sideFace = mountainAt(norm(sideSitIdx*15 + 180)).name;

    var jian;
    if (off <= 1.5 + 1e-9){
      jian = { type:'正向', fen:0, label:'正向', off:off };
    } else if (off <= 4.5 + 1e-9){
      var n = Math.min(3, Math.max(1, Math.round(off/1.5)));
      jian = { type:'兼', fen:n, off:off,
               label:'兼' + sideSit + sideFace + NUM_CN[n-1] + '分' };
    } else {
      jian = { type:'兼重', fen:null, off:off,
               label:'兼' + sideSit + sideFace + '过重（偏' + off.toFixed(1) + '°）' };
    }

    var fj = fenjinAt(sitDeg, mode);
    var kw = kongwangAt(sitDeg, width);
    var usable = (fj.attr === '旺' || fj.attr === '相');

    var advice;
    if (kw) advice = '大凶方位，避用';
    else if (!usable) advice = '不可用（犯' + fj.attr + '），建议换分金';
    else if (jian.type === '兼重') advice = '分金可用，兼向偏重需谨慎';
    else if (jian.fen === 3) advice = '可用，兼向偏重需谨慎';
    else advice = '可用';

    var conclusion = '坐' + sit.name + '山' + face.name + '向 · ' + jian.label +
                     ' · 分金' + fj.ganZhi + '（' + fj.attr + '）—— ' + advice +
                     (kw ? ' ⚠️' + kw.label : '');

    return {
      sittingDeg:sitDeg, facingDeg:facingDeg,
      sittingMountain:sit, facingMountain:face,
      offset:off, sideSit:sideSit, sideFace:sideFace, jian:jian,
      fenjin:fj, kongwang:kw, usable:usable, advice:advice,
      suggestion: usable ? [] : suggestFenjin(sit.index),
      conclusion:conclusion
    };
  }

  /* ---------------- GEOMAG（WMM2025） ---------------- */
  var GEOMAG = (function(){
    var WGS84_A = 6378137.0, WGS84_F = 1/298.257223563, WGS84_E2 = WGS84_F*(2-WGS84_F);
    var MAG_A = 6371200.0, NMAX = 12;

    function declination(latDeg, lonDeg, decYear, altKm){
      altKm = altKm || 0;
      var phi = latDeg*D2R, lam = lonDeg*D2R, h = altKm*1000;
      var sinp = Math.sin(phi), cosp = Math.cos(phi);
      var q = Math.sqrt(1 - WGS84_E2*sinp*sinp);
      var xe = (WGS84_A/q + h)*cosp, ze = (WGS84_A*(1-WGS84_E2)/q + h)*sinp;
      var r = Math.sqrt(xe*xe + ze*ze);
      var phig = Math.atan2(ze, xe);
      var sp = Math.sin(phig), cp = Math.cos(phig);

      /* Schmidt 半归一化勒让德函数及对纬度导数（x = sin φ'） */
      var P = [], dP = [];
      P[0] = [1]; dP[0] = [0];
      P[1] = [sp, cp]; dP[1] = [cp, -sp];
      for (var n=2;n<=NMAX;n++){
        P[n] = []; dP[n] = [];
        for (var m=0;m<=n;m++){
          if (m === n){
            var k1 = Math.sqrt((2*n-1)/(2*n));
            P[n][n]  = k1*cp*P[n-1][n-1];
            dP[n][n] = k1*(cp*dP[n-1][n-1] - sp*P[n-1][n-1]);
          } else {
            var kn = Math.sqrt(n*n - m*m);
            var use2 = (m <= n-2);
            var kp = use2 ? Math.sqrt((n-1)*(n-1) - m*m) : 0;
            P[n][m]  = ((2*n-1)*sp*P[n-1][m] - (use2 ? kp*P[n-2][m] : 0))/kn;
            dP[n][m] = ((2*n-1)*(cp*P[n-1][m] + sp*dP[n-1][m]) -
                        (use2 ? kp*dP[n-2][m] : 0))/kn;
          }
        }
      }

      var dt = decYear - WMM2025.epoch;
      var X=0, Y=0, Z=0;
      for (var ci=0; ci<WMM2025.c.length; ci++){
        var row = WMM2025.c[ci];
        var n2 = row[0], m2 = row[1];
        var g = row[2] + row[4]*dt, hh = row[3] + row[5]*dt;
        var ratio = Math.pow(MAG_A/r, n2+2);
        var cosml = Math.cos(m2*lam), sinml = Math.sin(m2*lam);
        var tau = g*cosml + hh*sinml;
        X += -ratio * tau * dP[n2][m2];
        Z += -ratio * (n2+1) * tau * P[n2][m2];
        if (m2 > 0) Y += ratio * m2 * (g*sinml - hh*cosml) * P[n2][m2];
      }
      Y = (Math.abs(cp) < 1e-10) ? 0 : Y / cp;
      /* 球面坐标(以地心纬度φ')旋转回大地坐标：ψ = φ' − φ */
      var psi = phig - phi;
      var Xg = X*Math.cos(psi) - Z*Math.sin(psi);
      var Yg = Y;
      return Math.atan2(Yg, Xg) * R2D;   /* 东偏为正 */
    }

    function decimalYear(date){
      var y = date.getFullYear();
      var start = Date.UTC(y,0,1), end = Date.UTC(y+1,0,1);
      return y + (Date.UTC(y, date.getMonth(), date.getDate()) - start)/(end - start);
    }

    return { declination:declination, decimalYear:decimalYear,
             model:'WMM2025', epoch:WMM2025.epoch };
  })();

  /* ---------------- GEO ---------------- */
  var GEO = (function(){
    var PI = Math.PI, GCJ_A = 6378245.0, GCJ_EE = 0.00669342162296594323;

    function outOfChina(lat, lng){
      return !(lng > 72.004 && lng < 137.8347 && lat > 0.8293 && lat < 55.8271);
    }
    function tLat(x, y){
      var r = -100 + 2*x + 3*y + 0.2*y*y + 0.1*x*y + 0.2*Math.sqrt(Math.abs(x));
      r += (20*Math.sin(6*x*PI) + 20*Math.sin(2*x*PI)) * 2/3;
      r += (20*Math.sin(y*PI) + 40*Math.sin(y/3*PI)) * 2/3;
      r += (160*Math.sin(y/12*PI) + 320*Math.sin(y*PI/30)) * 2/3;
      return r;
    }
    function tLng(x, y){
      var r = 300 + x + 2*y + 0.1*x*x + 0.1*x*y + 0.1*Math.sqrt(Math.abs(x));
      r += (20*Math.sin(6*x*PI) + 20*Math.sin(2*x*PI)) * 2/3;
      r += (20*Math.sin(x*PI) + 40*Math.sin(x/3*PI)) * 2/3;
      r += (150*Math.sin(x/12*PI) + 300*Math.sin(x/30*PI)) * 2/3;
      return r;
    }
    function wgs84ToGcj02(lat, lng){
      if (outOfChina(lat, lng)) return [lat, lng];
      var dLat = tLat(lng-105, lat-35), dLng = tLng(lng-105, lat-35);
      var radLat = lat/180*PI, magic = Math.sin(radLat);
      magic = 1 - GCJ_EE*magic*magic;
      var sq = Math.sqrt(magic);
      dLat = (dLat*180) / ((GCJ_A*(1-GCJ_EE))/(magic*sq)*PI);
      dLng = (dLng*180) / (GCJ_A/sq*Math.cos(radLat)*PI);
      return [lat+dLat, lng+dLng];
    }
    function gcj02ToWgs84(lat, lng){
      if (outOfChina(lat, lng)) return [lat, lng];
      var wl = lat, wg = lng;
      for (var i=0;i<3;i++){
        var g = wgs84ToGcj02(wl, wg);
        wl += lat - g[0]; wg += lng - g[1];
      }
      return [wl, wg];
    }
    function bearing(lat1, lng1, lat2, lng2){
      var p1 = lat1*D2R, p2 = lat2*D2R, dl = (lng2-lng1)*D2R;
      var y = Math.sin(dl)*Math.cos(p2);
      var x = Math.cos(p1)*Math.sin(p2) - Math.sin(p1)*Math.cos(p2)*Math.cos(dl);
      return norm(Math.atan2(y, x)*R2D);
    }
    function distance(lat1, lng1, lat2, lng2){
      var R = 6371008.8;
      var dp = (lat2-lat1)*D2R, dl = (lng2-lng1)*D2R;
      var a = Math.sin(dp/2)*Math.sin(dp/2) +
              Math.cos(lat1*D2R)*Math.cos(lat2*D2R)*Math.sin(dl/2)*Math.sin(dl/2);
      return 2*R*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
    function midpoint(lat1, lng1, lat2, lng2){
      var p1=lat1*D2R, l1=lng1*D2R, p2=lat2*D2R, l2=lng2*D2R;
      var Bx = Math.cos(p2)*Math.cos(l2-l1), By = Math.cos(p2)*Math.sin(l2-l1);
      var pm = Math.atan2(Math.sin(p1)+Math.sin(p2),
                Math.sqrt((Math.cos(p1)+Bx)*(Math.cos(p1)+Bx)+By*By));
      var lm = l1 + Math.atan2(By, Math.cos(p1)+Bx);
      var lmDeg = norm(lm*R2D);
      if (lmDeg > 180) lmDeg -= 360;
      return [pm*R2D, lmDeg];
    }
    return { outOfChina:outOfChina, wgs84ToGcj02:wgs84ToGcj02, gcj02ToWgs84:gcj02ToWgs84,
             bearing:bearing, distance:distance, midpoint:midpoint };
  })();

  /* ---------------- STORE ---------------- */
  var STORE = (function(){
    var SCHEMA_VERSION = 1;
    var DEFAULTS = { fenjinMode:'120', kongwangWidth:1.5, coordFormat:'deg',
                     trueNorthMode:false, dialStyle:'modern',
                     showLong72:false, showLong60:false };
    var MODES = ['120','240'], WIDTHS = [0.5,1,1.5], FORMATS = ['deg','dms'],
        STYLES = ['modern','classic'];

    function mergeSettings(raw){
      var s = { schemaVersion: SCHEMA_VERSION, _updated: Date.now() };
      for (var k in DEFAULTS) s[k] = DEFAULTS[k];
      if (raw && typeof raw === 'object'){
        if (MODES.indexOf(raw.fenjinMode) >= 0) s.fenjinMode = raw.fenjinMode;
        if (WIDTHS.indexOf(raw.kongwangWidth) >= 0) s.kongwangWidth = raw.kongwangWidth;
        if (FORMATS.indexOf(raw.coordFormat) >= 0) s.coordFormat = raw.coordFormat;
        if (typeof raw.trueNorthMode === 'boolean') s.trueNorthMode = raw.trueNorthMode;
        if (STYLES.indexOf(raw.dialStyle) >= 0) s.dialStyle = raw.dialStyle;
        if (typeof raw.showLong72 === 'boolean') s.showLong72 = raw.showLong72;
        if (typeof raw.showLong60 === 'boolean') s.showLong60 = raw.showLong60;
      }
      return s;
    }
    function pushRecord(list, rec, cap){
      cap = cap || 50;
      list = (list || []).slice();
      list.push(rec);
      if (list.length > cap) list = list.slice(list.length - cap);
      return list;
    }
    function safeParse(json, fallback){
      try { var v = JSON.parse(json); return (v === null || v === undefined) ? fallback : v; }
      catch(e){ return fallback; }
    }
    return { DEFAULTS:DEFAULTS, mergeSettings:mergeSettings,
             pushRecord:pushRecord, safeParse:safeParse };
  })();

  /* ---------------- 其他纯工具 ---------------- */
  function mapSensorToDial(heading){ return norm(-heading); }

  function formatDMS(deg, isLat){
    var hemi = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
    var a = Math.abs(deg), d = Math.floor(a), m = Math.floor((a-d)*60),
        s = ((a-d)*60-m)*60;
    return d + '°' + String(m).padStart(2,'0') + '′' +
           s.toFixed(1).padStart(4,'0') + '″' + hemi;
  }

  /* ---------------- 龙脉层（穿山七十二龙 / 透地六十龙）----------------
     共同钥匙：六十甲子中天干戊己的12个组合因戊己居中央、不入
     二十四山方位，在罗盘各层皆为空亡 → 有效龙恒为 48。
     穿山七十二龙：72格 = 48实龙(非戊己) + 24正中空格，每山3格，甲子起壬山左格顺布。
     透地六十龙：60格 = 六十甲子完整布列，每龙6°，甲子起337.5°；戊己12龙标空亡。
     吉凶：纳音五行 vs 山家正五行论生克 → 旺/相(吉)·泄/囚/死(凶)·空亡(大凶)。 */
  var GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  var ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  var JIAZI = (function(){ var a=[]; for(var i=0;i<60;i++) a.push(GAN[i%10]+ZHI[i%12]); return a; })();
  var NAYIN = [                              /* 三十纳音，每两甲子一组 [名,五行] */
    ['海中金','金'],['炉中火','火'],['大林木','木'],['路旁土','土'],['剑锋金','金'],
    ['山头火','火'],['涧下水','水'],['城头土','土'],['白蜡金','金'],['杨柳木','木'],
    ['泉中水','水'],['屋上土','土'],['霹雳火','火'],['松柏木','木'],['长流水','水'],
    ['砂中金','金'],['山下火','火'],['平地木','木'],['壁上土','土'],['金箔金','金'],
    ['覆灯火','火'],['天河水','水'],['大驿土','土'],['钗钏金','金'],['桑柘木','木'],
    ['大溪水','水'],['沙中土','土'],['天上火','火'],['石榴木','木'],['大海水','水']
  ];
  function nayinOf(jiaziIdx){ var p = NAYIN[Math.floor(jiaziIdx/2)]; return {name:p[0], element:p[1]}; }
  /* 二十四山正五行（山家五行） */
  var MOUNTAIN_ELEMENT = {
    '子':'水','癸':'水','丑':'土','艮':'土','寅':'木','甲':'木','卯':'木','乙':'木',
    '辰':'土','巽':'木','巳':'火','丙':'火','午':'火','丁':'火','未':'土','坤':'土',
    '申':'金','庚':'金','酉':'金','辛':'金','戌':'土','乾':'金','亥':'水','壬':'水'
  };
  var GEN = {'金':'水','水':'木','木':'火','火':'土','土':'金'};   /* 龙生山者(我生) */
  var KE  = {'金':'木','木':'土','土':'水','水':'火','火':'金'};   /* 龙克山者(我克) */
  function dragonFortune(mountainName, dragonElement){
    var me = MOUNTAIN_ELEMENT[mountainName];
    if (!me || !dragonElement) return '—';
    if (me === dragonElement) return '旺';        /* 比和 */
    if (GEN[dragonElement] === me) return '相';    /* 龙生山 */
    if (GEN[me] === dragonElement) return '泄';    /* 山生龙 */
    if (KE[dragonElement] === me) return '囚';     /* 龙克山 */
    if (KE[me] === dragonElement) return '死';     /* 山克龙 */
    return '—';
  }
  /* 穿山七十二龙表：LONG72_VAL[k]=六十甲子index(-1=正中空格)；LONG72_MTN[k]=所属山index */
  var LONG72_VAL = new Array(72), LONG72_MTN = new Array(72);
  (function(){
    var real = [];                                /* 六十甲子剔除戊己后的48龙序号 */
    for (var i=0;i<60;i++){ var ch = JIAZI[i].charAt(0); if (ch==='戊'||ch==='己') continue; real.push(i); }
    var ri = 0;
    for (var k=0;k<72;k++){
      var cellIdx = ((23*3) + k) % 72;            /* 山数组格位，从壬山左格(=69)起顺时针 */
      var mi = Math.floor(cellIdx/3);
      LONG72_MTN[k] = mi;
      if (cellIdx % 3 === 1) LONG72_VAL[k] = -1;  /* 每山正中格 = 正空亡 */
      else LONG72_VAL[k] = real[ri++];            /* 左右格填实龙 */
    }
  })();
  /* 穿山七十二龙：给定坐度(deg)→格信息。每格5°，甲子起337.5°(壬山左格=亥壬界) */
  function long72At(deg){
    var k = Math.floor(norm(deg - 337.5)/5);      /* 0..71 */
    var v = LONG72_VAL[k], mname = MOUNTAINS[LONG72_MTN[k]];
    if (v === -1) return { index:k, empty:true, label:'正空亡', mountain:mname };
    var ny = nayinOf(v);
    return { index:k, empty:false, jiaziIdx:v, ganZhi:JIAZI[v],
             nayin:ny.name, element:ny.element, mountain:mname,
             fortune:dragonFortune(mname, ny.element) };
  }
  /* 透地六十龙：给定坐度(deg)→龙信息。每龙6°，甲子起337.5°；戊己12龙=空亡 */
  function long60At(deg){
    var k = Math.floor(norm(deg - 337.5)/6);     /* 0..59 */
    var jz = JIAZI[k], ch = jz.charAt(0);
    var ny = nayinOf(k), mname = MOUNTAINS[Math.floor(norm(deg + 7.5)/15)];
    return { index:k, jiaziIdx:k, ganZhi:jz, nayin:ny.name, element:ny.element,
             empty:(ch==='戊'||ch==='己'), mountain:mname,
             fortune:dragonFortune(mname, ny.element) };
  }

  /* ---------------- 手工排盘：已移除（V1.4） ---------------- */

  return {
    MOUNTAINS:MOUNTAINS, BRANCHES:BRANCHES, FJ120:FJ120,
    STEM_ATTR:STEM_ATTR, NUM_CN:NUM_CN,
    JIAZI:JIAZI, NAYIN:NAYIN, MOUNTAIN_ELEMENT:MOUNTAIN_ELEMENT,
    LONG72_VAL:LONG72_VAL, LONG72_MTN:LONG72_MTN,
    norm:norm, circDist:circDist, branchOfMountain:branchOfMountain,
    mountainAt:mountainAt, fenjinAt:fenjinAt, kongwangAt:kongwangAt,
    analyze:analyze, suggestFenjin:suggestFenjin,
    nayinOf:nayinOf, dragonFortune:dragonFortune,
    long72At:long72At, long60At:long60At,
    GEOMAG:GEOMAG, GEO:GEO, STORE:STORE,
    mapSensorToDial:mapSensorToDial, formatDMS:formatDMS
  };
})();

/* ---- 小程序模块导出（H5 中 LP 为全局变量，此处转为 CommonJS）---- */
module.exports = LP;
