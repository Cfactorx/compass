# 罗盘分金（Luopan Fenjin）

二十四山 · 分金 · 空亡 · 磁偏角 —— 一个把传统罗盘判读规则做成**可验证几何计算**的双端工具。

同一份判读引擎，两个发布形态：

| 端 | 形态 | 入口 |
|---|---|---|
| H5 | 单文件应用，`file://` 直开或静态托管 | `index.html` |
| 微信小程序 | 原生小程序工程 | `miniprogram/` |

---

## 核心能力

- **二十四山**：24 山 × 15°，子 0° 起顺时针；12 地支 + 8 天干（戊己居中不入山）+ 4 卦维（艮巽坤乾）
- **120 / 240 分金**：地支山用本支，干维山借顺时针前一支；240 分金按 1.5° 半格细分
- **孤虚旺相**：丙庚=旺 / 丁辛=相 / 甲壬=孤 / 乙癸=虚 / 戊己=空亡
- **空亡线检测**：卦界大空亡（22.5°+45k）、山界小空亡（7.5°+15k）
- **兼向三态**：≤1.5° 正向 / 1.5°~4.5° 兼 N 分 / >4.5° 过重
- **龙脉层**：穿山七十二龙（48 实龙 + 24 空格）、透地六十龙（60 甲子，戊己 12 龙标空亡）
- **WMM2025 磁偏角**：12 阶球谐展开，六城参考误差 ≤0.0005°，支持真北/磁北换算
- **坐标系**：GCJ-02 ↔ WGS-84 国标近似双向转换（适配国内地图瓦片）

## 双端架构：引擎单一事实来源

```
assets/part1.html  ←← 唯一引擎来源（/*ENGINE-START*/ ~ /*ENGINE-END*/ 纯函数区）
       │
       ├── H5：全局 var LP，与 part2.html（UI IIFE）合并为 index.html
       │
       └── 小程序：scripts/build-mp-engine.js 自动抽取
                    → miniprogram/utils/engine.js（生成产物，禁止手改）
```

改引擎只改 `assets/part1.html`，然后 `npm run build` 同步双端。`check-mp.js` 的 C12 检查项强制校验小程序引擎与源同源。

H5 合并规则：`index.html` = part1.html（HTML+CSS+引擎）+ part2.html（UI 层），由 `scripts/merge.js` 完成，4 项硬校验（收尾契约 / script 语法 / 标签平衡 / 关键 DOM 节点）。

## 快速开始

```bash
# 构建（引擎抽取 + 小程序图标 + H5 合并）
npm run build

# 全量验证（构建 + 引擎测试 + UI 一致性 + 小程序自检，含反向验证）
npm run verify
```

H5 直接双击 `index.html` 即可，零依赖、零后端；小程序用微信开发者工具导入 `miniprogram/` 目录。

## 测试与自检体系

| 脚本 | 覆盖 | 说明 |
|---|---|---|
| `tests/run.js` | T1–T12 + T14，**181 条断言** | 领域规则 / 磁偏角 / 坐标 / 存储 |
| `tests/ui_static.js` | U1–U4 | H5 UI 对引擎引用的跨文件符号一致性 |
| `scripts/check-mp.js` | C1–C15 | 小程序静态自检（禁词 / 免责覆盖 / 引擎同源 / **C15 地理位置接口硬拦截**） |

**两个检查器都带 `--selftest` 反向验证**：构造缺陷夹具断言检查器确实报错，防止「恒通过假阳性」。验收数字全部来自实跑，不做文档推断。

## 目录结构

```
├── assets/
│   ├── part1.html          # H5：HTML + CSS + 判读引擎（引擎唯一来源）
│   ├── part2.html          # H5：UI 层 IIFE
│   ├── WMM.COF / WMM_2025.COF / wmm2025.js   # WMM 系数（fix_coeffs.js 双源校验）
│   └── decl_reference.json  # 六城磁偏角参考（tests T5）
├── miniprogram/            # 微信小程序工程（5 页面 / 零依赖）
│   ├── pages/              # live 罗盘 / map 地图 / records 记录 / settings 设置 / about
│   ├── utils/              # engine（生成）/ terms / store / geo / compass / dial
│   └── README.md           # 子工程详细说明
├── scripts/
│   ├── merge.js            # H5 合并（4 项硬校验）
│   ├── build-mp-engine.js  # 引擎抽取（零 DOM 校验 + 24 项导出 + 冒烟）
│   ├── build-mp-icons.js   # PNG 图标生成（Node zlib 手写编码）
│   └── check-mp.js         # 小程序静态自检 C1–C15（含 --selftest）
├── tests/                  # 181 断言 + UI 一致性 + E2E
├── .product_docs/          # BRD / PRD / TDD / 评审 / 测试 / 验收文档
├── index.html              # H5 交付物（生成产物）
├── 使用说明.md / .html      # 用户手册
└── 小程序上线操作手册.md    # 上线人工作业指引
```

## 设计决策摘录

- **不使用设备定位**：本工具需要的是「所测量的那个地点」的磁偏角，而非「手机所在地」。用户通过地图准星或坐标输入显式指定测量位置 —— 同时彻底规避了微信对地理位置接口的准入限制（错误码 61040），`check-mp.js` C15 硬拦截回归。
- **小程序端合规术语中性化**：`miniprogram/utils/terms.js` 是唯一文案出口（旺/相/孤/虚 → 主格/次格/偏格/骑线），页面禁止直接读引擎的褒贬结论（C5b 强制）。
- **换行符统一 LF**（`.gitattributes`），避免 Windows/macOS 协作污染。

## 许可说明

`assets/` 下的 WMM 系数文件（`WMM.COF` / `WMM_2025.COF`）来自 NOAA/NCEI 发布的 World Magnetic Model，随仓库分发仅用于测试基准；引擎实现为本项目原创，磁偏角结果经六城参考值交叉验证。
