# 方位分金罗盘 · 小程序端

传统方位测量与数据记录工具的微信小程序实现。与 H5 版共用**同一份判读引擎**（`assets/part1.html`），保证两端判读结果完全一致。

---

## 一、工程结构

```
miniprogram/
├── app.js / app.json / app.wxss / sitemap.json   全局入口与主题
├── project.config.json                            开发者工具工程配置（appid 待替换）
├── assets/
│   ├── pin-sit.png       坐点标注（红）
│   ├── pin-face.png      向点标注（橙）
│   └── pin-locate.png    定位标注（蓝）
├── components/
│   └── disclaimer/       免责声明组件（每页必引，合规要求）
├── pages/
│   ├── live/             实地罗盘：Canvas 2D 盘面 + 磁力计 + 手动转盘降级
│   ├── map/              地图量测：原生 map + 十字准星取点 + 点击定向
│   ├── records/          测量记录：查看 / 删除 / 清空 / 复制
│   ├── settings/         设置：分金体系 / 界线宽度 / 坐标格式 / 盘面风格 / 真北修正 / 龙脉层
│   └── about/            术语对照与算法说明
└── utils/
    ├── engine.js         【自动生成】判读引擎，来自 assets/part1.html
    ├── terms.js          术语中性化映射（合规核心）
    ├── store.js          wx.Storage 封装
    ├── geo.js            测量位置 + WMM2025 磁偏角（不使用设备定位）
    ├── compass.js        wx.startCompass 封装
    └── dial.js           罗盘盘面绘制（Canvas 2D + 离屏缓存）
```

**零依赖**：不使用 npm 包、不使用云开发、**不联网、不申请任何设备定位权限**。所有 PNG 图标由脚本现场生成。

---

## 一之补充：为什么不用设备定位（重要）

微信自 2022-07-14 起对 8 个地理位置接口（`wx.getLocation`、`chooseLocation`、
`onLocationChange` 等）实行**准入制**：代码里出现该调用而 AppID 未获对应权限时，
上传/提交审核会直接报 **61040**（地理位置接口权限或声明缺失）。新账号默认没有
这个权限，会直接卡死发布流程。

本工具因此完全不使用设备定位，改为由用户**显式指定测量点**：

| 入口 | 位置 |
|---|---|
| 地图页 · 右侧 ◎ 按钮 | 把十字准星对准目标 → 点 ◎ → 该坐标成为测量位置 |
| 地图页 · 底部坐标输入 | 输入经纬度 → 点「跳转」→ 同时设为测量位置 |
| 罗盘页 · 底部「测量位置」卡 | 直接输入经纬度 → 点「设定」 |

这不只是合规妥协，**语义上也更正确**：工具需要的是「所测量的那个地点」的磁偏角，
而不是「手机当前所在位置」的磁偏角——测量对象可能是一处宅基或地块，人未必站在那里。

`scripts/check-mp.js` 的 **C15** 会硬性拦截：JS 中出现任何地理位置接口调用、
`app.json` 中出现 `requiredPrivateInfos` / `scope.userLocation`、
WXML 的 `<map>` 出现 `show-location`，都会直接报错。

---

## 二、构建与校验

在项目根目录执行：

| 命令 | 作用 |
|---|---|
| `npm run build:mp` | 从 `assets/part1.html` 抽取引擎 → 生成 `utils/engine.js` |
| `npm run build:mpicons` | 生成 3 个地图标注 PNG（纯 Node，零依赖） |
| `npm run build` | 上面两步 + 重新合并 H5 的 `index.html` |
| `npm run test:mp` | 小程序工程静态自检 C1–C15 |
| `npm run test:mp:selftest` | **反向验证**：构造缺陷夹具，断言自检确实报错 |
| `npm test` | H5 引擎测试（181 断言）+ UI 跨文件一致性校验 |
| `npm run verify` | 全量：构建 + 所有测试 + 双向反向验证 |

### ⚠️ 引擎不可手改

`utils/engine.js` 是**生成产物**。改引擎请改 `assets/part1.html`，然后跑 `npm run build:mp`。
`check-mp.js` 的 C12 会校验两者同源，手改后自检会直接失败。

---

## 三、自检项说明（`scripts/check-mp.js`）

| 编号 | 检查内容 |
|---|---|
| C1 | `app.json` 的 pages ↔ 磁盘文件齐全 |
| C2 | `usingComponents` 路径可达 |
| C3 | WXML 事件绑定的处理函数在对应 `.js` 中存在 |
| C4 | WXSS 禁止本地图片 `url()`（真机不显示） |
| C5 | 合规禁词扫描（去注释后扫描） |
| C5b | 业务代码禁止直接读 `r.advice` / `r.conclusion`，必须走 `terms.conclusionOf()` |
| C6 | 每页必须引用免责声明组件 |
| C7 | `require` 路径不得越出小程序根 |
| C8 | WXML 不得使用小程序不支持的 HTML 标签 |
| C9 | JS 不得使用浏览器专属全局 |
| C10 | 禁止联网 API（隐私承诺「零上传」） |
| C11 | `tabBar.pagePath` 必须在 pages 中 |
| C12 | `utils/engine.js` 必须与 `assets/part1.html` 引擎同源 |
| C13 | 所有 `.js` 必须通过语法解析 |
| C14 | WXML 标签闭合平衡、属性引号配对 |
| C15 | **禁止地理位置接口**（`wx.getLocation` 等 10 个）+ 禁止 `requiredPrivateInfos` / `scope.userLocation` / `show-location`，规避微信 61040 上传阻断 |

`--selftest` 会构造一个集齐 13 类缺陷的夹具并断言逐项报错，**防止出现「检查器恒通过」的假阳性**。

---

## 四、合规设计

微信小程序运营规范禁止「占卜、算命、看风水」类内容。本项目按**工具化改造**策略处理：

1. **定位为测量工具**：所有输出均为方位角、度数、干支、格位等可复算的几何/查表结果。
2. **术语中性化**（`utils/terms.js` 统一出口）：

   | 古籍术语 | 对外表述 |
   |---|---|
   | 旺 / 相 / 孤 / 虚 / 空亡 | 主格 / 次格 / 偏格 / 空格 / 骑线 |
   | 旺相泄囚死（龙脉） | 比和 / 纳音生山 / 山生纳音 / 纳音克山 / 山克纳音 |
   | 吉 / 凶 | 格位可用 / 格位不宜 |
   | 大凶方位，避用 | 该方位落在山界线上，建议调整角度 |

3. **免责声明**：每页底部必现，关于页有完整版。
4. **禁词扫描**：C5 覆盖 40+ 个高风险词。
5. **隐私承诺**：C10 硬禁止 `wx.request` 等联网 API——位置与记录只写本机。

---

## 五、与 H5 版的差异

| 维度 | H5 版 | 小程序版 |
|---|---|---|
| 传感器 | `DeviceOrientationEvent` + iOS `requestPermission()` | `wx.startCompass` / `wx.onCompassChange`（**无需授权弹窗**） |
| 地图 | 自实现 Slippy 瓦片 + canvas overlay + pointer 手势 | 原生 `<map>` 组件 + 十字准星取点 |
| 取点方式 | 长按选坐点 + 拖手柄定向 | 准星取坐点 + 点击地图定向（附准星定向兜底按钮） |
| 测量位置 | `navigator.geolocation` / 设备 GPS | **不使用设备定位**，由用户显式指定（准星 / 坐标输入） |
| 存储 | `localStorage` | `wx.setStorageSync` |
| 盘面 | `document.createElement('canvas')` | `wx.createOffscreenCanvas({type:'2d'})` |
| 字体 | `700 30px` | `bold 30px`（数字字重在小程序不稳定） |
| 引擎 | 全局变量 `LP` | CommonJS `module.exports = LP` |

**判读引擎 100% 复用**（432 行、27 个纯函数，零 DOM 依赖）。

---

## 六、已知平台限制

- `<map>` 的 `markers` 不支持拖拽事件，故定向改为「点击地图」+「准星」两种方式。
- `cover-view` 会吞掉其矩形范围内的触摸，故十字准星拆成 3 个细条而非整块容器。
- 部分机型/模拟器无磁力计，罗盘页会自动降级为手动转盘模式。
- `wx.createOffscreenCanvas` 需基础库 ≥ 2.7.0；更低的版本盘面绘制会退化为纯文字判读。
- **不使用设备定位**：无法自动把地图移到「我所在的位置」，首次进入停在默认中心（广州）。
  这是为规避微信 61040 准入而做的取舍——见上文「为什么不用设备定位」。
- `project.config.json` **不硬编码 AppID**：发布平台在扫码绑定账号后自行注入。
  本地用开发者工具调试时，工具会提示选择 AppID，填入自己的测试号或正式号即可。
