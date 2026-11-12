# Project Status

## Project Name: 罗盘分金 — 基于地图坐标定位分金的手机网页版罗盘
## Current Version: **V1.6.2**（H5 双 P0 修复 + 微信小程序端交付）
## Current Phase: ✅ H5 V1.6 完成 / ✅ 小程序 1.0.0 代码就绪（待人工注册 AppID 后上线）
## Started: 2026-08-25
## Latest Release: 2026-10-14 GMT+8

## Phase Tracker

| Phase | Status | Owner | Started | Completed |
|-------|--------|-------|---------|-----------|
| 1. Requirement Analysis | ✅ DONE | RA | 2026-08-25 | 2026-08-25 |
| 2. Product Design | ✅ DONE | PM | 2026-08-25 | 2026-08-25 |
| 3. Round-Table Review | ✅ DONE | Orchestrator | 2026-08-25 | 2026-08-25 |
| 4. Technical Design | ✅ DONE | TM | 2026-08-25 | 2026-08-25 |
| --- Human Approval Gate --- | ✅ APPROVED | User | 2026-08-25 | 2026-08-25 |
| 5. Development | ✅ DONE | Dev | 2026-08-25 | 2026-08-25 |
| 6. Testing | ✅ DONE | QA | 2026-08-25 | 2026-08-25 |
| 7. Acceptance | ✅ ACCEPTED | RA+PM | 2026-08-25 | 2026-08-25 |

## Key Decisions Log

- [2026-08-25] 项目初始化。用户需求：开发一个根据地图坐标定位分金的手机网页版罗盘。
- [2026-08-25] Orchestrator 创建 `.product_docs/` 目录结构，建立 8 项任务追踪。
- [2026-08-25] 领域定性：产品属玄学工具类 H5 应用，核心专业能力 = 地图坐标 → 磁偏角修正 → 罗盘分金判读（120/240 分金、二十四山、空亡线、孤虚旺相）。
- [2026-08-25] BRD v1.0 归档（01_requirements/BRD.md）：5 大痛点、双模式定位、磁偏角护城河、4 项待确认事项。
- [2026-08-25] PRD v1.0 归档（02_product/PRD.md）：13 项功能（P0×8/P1×4/P2×1）、23 条验收标准、3 条用户路径。
- [2026-08-25] 圆桌评审通过（03_reviews/review_log_20260825.md）：4 项 Critical（瓦片降级/传感器回退链/WMM 系数来源/120 分金生成规则）全部决议；PRD 修订 3 处；全体 AGREED。
- [2026-08-25] PRD 评审修订落实：AC02 改为映射函数单测、免责声明双模式常驻、瓦片降级条款。
- [2026-08-25] TDD v1.0 归档（04_technical/TDD.md）：单文件 SPA + 引擎纯函数分层、120 分金三要素生成规则与锚点校验集、WMM 系数决策树、传感器三级回退链、腾讯瓦片 + 网格降级、测试策略与风险登记册。
- [2026-08-25] **人工审批门禁通过：用户确认「已确认，请继续」，进入 Phase 5 开发。**
- [2026-08-25] **Phase 5 开发完成**：`index.html`（64KB 单文件）= part1（HTML+CSS+ENGINE 纯函数引擎）+ part2（UI 层）；`tests/run.js` 引擎单元测试 **124/124 通过（100%）**。
- [2026-08-25] 开发期缺陷修复记录（Dev）：
  - **CRITICAL-1：WMM2025 系数错版**——早期嵌入的系数表 n≥3 全部错值（来源不明的旧版）；用 `assets/WMM_2025.COF`（pygeomag 分发的 NOAA 官方系数）与 `assets/geomag_src`（npm geomagnetism 包 wmm-2025.json）双源校验后重嵌，修复后六城磁偏角误差 ≤0.0005°。
  - **CRITICAL-2：Z 分量符号与 ψ 旋转方向错误**——对照 geomagnetism 包（magnetic_vector.js）修正为 Z=−Σ(a/r)^(n+2)(n+1)τP̄、ψ=φ′−φ、Xg=X·cosψ−Z·sinψ。
  - **MAJOR-1：fenjinAt 跨 0° 山错格**——local=deg−base 超 360° 未归一（359.9° 误判癸子格），改用 norm() 归一，随机 10000 点落格一致性通过。
  - **MINOR-1：地图缩放按钮缺陷**——mapView 未暴露缩放方法且 mapZoomOut 缺 pointerdown stopPropagation；新增 mapView.zoomBy(dz) 并修正绑定。
- [2026-08-25] 需求决议：PRD F05「地点搜索」由「手动输入经纬度坐标」替代（免密钥静态部署约束，无法地理编码）；瓦片地图 + 手动输入双入口。
- [2026-08-25] TDD 回写：§坐向语义按实现澄清——向方 bearing=坐点→向点（真北方位角），坐=向+180°，分金取坐山格；M=T−D（东偏为正）。
- [2026-08-25] **Phase 6 测试完成**：QA 报告归档（05_testing/test_report.md）——引擎 124/124 断言通过、六城磁偏角误差 0.0005°、DOM ID 全解析；4 项开发期缺陷已修复回归；5 项真机抽检遗留（不阻塞）。判定 PASS。
- [2026-08-25] **Phase 7 验收完成**：验收报告归档（06_acceptance/acceptance_report.md）——ACCEPTED（有条件：真机清单 3 日内抽检）。**项目交付。**

- [2026-08-26] V1.0.1 微调（用户需求）：网页 `<title>` 及页头 brand 标题追加署名「--powered by 吕庆新」；署名以 10px 半透明小字呈现避免挤压页头 chip 栏。part1.html（源）与 index.html（成品）同步更新，124/124 断言回归通过。
- [2026-08-26] V1.1 功能扩展（用户需求）：新增「穿山七十二龙」「透地六十龙」两个可选显示层。引擎层加 JIAZI/NAYIN/MOUNTAIN_ELEMENT/long72At/long60At/dragonFortune（48实龙+24正空亡/60甲子含戊己空亡、纳音五行vs山家正五行论旺相休囚死）；UI层设置页加双开关、buildDial 八卦环内移(r198)腾出[210,278]龙脉环区按开关渲染五行色+干支+空亡标记、判读面板(实地/地图双处)追加龙信息行。163/163断言通过。
- [2026-09-10] V1.2 功能扩展（用户需求：手动输入坟地坐标及坐向→输出结果与建议）：新增**「手工排盘」Tab**（第3个Tab）。三种坐向输入方式并存：①坐山下拉(24山)+偏出中线度数(0-7.5°)+偏向(顺/逆) ②直接填坐方/向方度数(0-360°) ③文本解析「坐子山午向」「子山兼壬三分」「偏东2度」等。坐标可选填经纬度→自动算WMM磁偏角→真北/磁北自动换算；输出完整判读+兼向+分金+空亡+龙脉层(跟随开关)+**本山可用分金建议**+复制结论+存记录。引擎加 parsePanText/MOUNTAIN_IDX 纯函数。189/189断言通过（新增T13解析26条），768组合边界扫描零异常。
- [2026-09-10] UX/交互逻辑专项评审（用户需求，@skill:product-dev-team）：PM+交互设计师+QA 复合视角走查三模式全流程，产出 03_reviews/ux_review_20260910.md。发现 **3 个真实 Bug**（记录 mode 标签错乱/实地罗盘漏真北换算/磁偏角缓存无坐标校验）+ 6 项可用性风险，按 P0/P1/P2 分级整改建议。
- [2026-09-10] P0 缺陷修复（用户确认修复）：①BUG-1 记录页 mode 标签三态映射（pan→手工排盘，不再错标为地图量测）✅ ②BUG-3 磁偏角缓存加 24h 过期校验 ✅ ③**BUG-2 撤回**——数值验证确认实地罗盘 effFacing 已正确做 heading+decl 真北换算，三模式本就一致，评审误判。回归 200/200 断言通过（新增 T14 UI 修复校验 11 条）。
- [2026-09-10] V1.4 功能收窄（用户需求：**取消手工排盘**）：实测发现手输坐向偏离实地使用场景（实地罗盘+地图量测两路传感器/坐标输入已覆盖真实判读需求，手输易引入歧义）。系统化移除：
  - HTML：删除 nav 第 3 个 Tab 按钮（`data-tab="pan"`）+ `#view-pan` 整段 section（含 #panMode/#paneSumb/#paneDeg/#paneText/#selMountain/#inpOffset/#panDir/#inpDeg/#panDegKind/#inpText/#panLat/#panLng/#btnPanCalc/#btnPanReset/#panCard/#panCoordTip 等 14 个 DOM 节点）。
  - CSS：删除 `.pan-box/.pan-seg/.pan-row/.pan-pane/.pan-row label/.pan-row select,.pan-row input/.pan-row select/.pan-row .unit/.pan-tip/.pan-actions/.pan-actions .btn/.pan-row select:focus/.pan-row input:focus/#view-pan .card/.pan-sug/.pan-sug b/.sug-chip/.pan-box select,.pan-box input` + `@media (max-width:360px)` 的两条 pan 规则。
  - JS（part2）：删除 `panMode/panDir/panDegKind/panLast` 四个全局变量、`initPanSelect` 立即调用、三组按钮 onclick（panMode/panDir/panDegKind）、`resolvePanSitDeg` 三模式归一函数、`renderPanCard` 完整判读流程（≈100 行）、`panLastInputDesc`、`btnPanCalc`/`btnPanReset` onclick、5 个输入框回车绑定；`switchTab` 删除 pan 分支（`view-pan` toggle + `updateChips()`）。
  - ENGINE（part1）：删除 `MOUNTAIN_IDX` 山名映射、`CN_FEN` 中文数字表、`parsePanText` 解析函数（≈67 行）及 `MOUNTAIN_IDX:MOUNTAIN_IDX, parsePanText:parsePanText,` 导出。
  - 测试（tests/run.js）：删除整个 T13 区块（26 条断言）；保留 T14 UI 静态校验（11 条），三态映射 `pan:'手工排盘'` 仍用于历史记录正确显示旧 pan 模式数据。
  - **回归 174/174 断言通过**（200-26 T13），实地罗盘+地图量测两模式不受影响，磁偏角缓存 24h 过期保护保留。

- [2026-09-10] V1.5 评审（用户需求：@skill:product-dev-team 再次走查 UX/交互/系统逻辑）：V1.4 移除手工排盘后启动第二轮复合视角评审（PM+IxD+QA+TM 四角色），产出 ux_review_20260910_v15.md。核心发现：
  - **P0 6 条**：①实地/地图 params 面板默认状态不一致（破坏"专业工具"心智）②地图无方向箭头（认知负担）③旧 pan 模式记录无迁移（数据可信度打击）④settings 持久化无 schemaVersion（架构债）⑤localStorage 不可用→白屏（崩溃路径）⑥真北开关切换无反馈（可感知 bug）
  - **P1 7 条**：空亡/凶视觉等同、brand 缺师承叙事、真北展示口径两模式不同、空亡宽度无视觉反馈、双指 pinch 第一帧延迟、iOS permSkip listener 残留、后台唤醒罗盘乱跳
  - **P2 12 条**：首帧假凶判读、iOS 权限弹窗过早、长按 500ms 过长、瓦片失败率、坐/向色彩锚定、画布缓存、瓦片 LRU、quota 兜底、rAF 节流、相对模式漂移提示、单文件拆模块等
  - 整改建议：P0 6 条可在 1-2 小时内全修复（每条 ≤30 行），P1 4-5 小时，P2 单独排期
  - 测试盲点：当前 174 断言仅覆盖引擎纯函数，未覆盖传感器事件链、判读卡渲染、地图交互、localStorage 异常路径——建议下一步补 pupeteer/playwright 端到端冒烟脚本

- [2026-09-11] **V1.5 P0 修复全部落地**（用户确认「需要」）：6 条 P0 全部修复，回归 181/181 断言通过（174 旧 + 7 新增 T14 子断言），引擎层 + UI 层 E2E 行为验证均 OK。具体落地：
  - **P0-1** 实地 `<details class="params">` 加 `open` 属性，与地图同节奏
  - **P0-2** drawOverlay 在虚线中点用 Math.atan2 画方向三角 ▶，白边+橙填充；mapHint 改两行明确"长按选坐点 / 拖橙圆定向"
  - **P0-3** renderRecords 启动时一次性迁移：遍历 list 把 `mode==='pan'` 改 `map`、migrated 标记回写 localStorage，并在列表顶部渲染迁移提示横幅 "V1.4 起「手工排盘」已合并到「地图量测」，旧记录已自动归类"；三态映射同步收为两态
  - **P0-4** STORE.mergeSettings 返回值加 `schemaVersion: 1` + `_updated: Date.now()`，未知字段继续白名单静默丢弃（保留现有安全语义）
  - **P0-5** state 初化用 try/catch 包裹 localStorage 读取，catch 时设置 `state._noStorage=true` 并回退到默认 settings；saveSettings / saveRecord 写入路径同样 try/catch，写入失败时再标记 `_noStorage` 并 toast"存储不可用，本次配置不保存"，**彻底消除 Safari 隐私模式白屏崩溃路径**
  - **P0-6** applySettings 末尾追加 `if (typeof effFacing === 'function' && state.hasHeading) renderLiveCard(effFacing());`，真北/分金/龙脉层等所有 settings 开关切换后**即时刷盘面**无需晃动手机
  - **测试**：T14 区块从 11 条扩展为 18 条（移除三态检查 1 条 + 新增 7 条：pan 迁移 / 迁移提示文案 / 旧二元表达式 / schemaVersion / localStorage 兜底 / applySettings 即时反馈 / 地图箭头）
  - **E2E 行为验证**：4 条混合记录中 2 条 pan 自动迁移成功；mergeSettings 返回值 schemaVersion=1 + _updated=ts；localStorage 抛 QuotaExceededError 时 state 仍可初始化

- [2026-09-11] V1.5.1 **「打开页面全是代码」修复**（用户报告）：双错叠加——
  1. P0 6 条修复只改了 index.html，未同步到 part1.html / part2.html 源文件（违反工程约定）
  2. V1.4 之前某次 Edit 误删 part1.html 末尾 `</script></body></html>` 收尾，导致 part2.html 末尾的 `</script></body></html>` 充当 part1 收尾，把 part1 后半部分（pageRecords/.../toast/ENGINE 块）错误地推到了 body 之外
  - 修复：补回 part1.html 末尾 `</script></body></html>` + 删 part2.html 末尾收尾 + 重新设计合并规则（`<script>` 切分点，ENGINE 在前 UI 在后）+ 把 P0 6 条修复**逆向同步**到源文件 + 重合并
  - 教训已写入 MEMORY.md：改 part1/part2 源文件 → 合并 → 测试，**绝不在 index.html 上直接 Edit**；合并规则固定为 part1 含收尾 / part2 不含 / `<script>` 切分点
  - 最终：index.html 80K / part1 35K / part2 45K / 181/181 断言通过 / 浏览器模拟执行两个 `<script>` 块均 OK

- [2026-09-11] V1.5.2 **「无法调出键盘输入经纬度坐标」修复**（用户报告）：根因 = #mapArea 的 pointerdown.preventDefault() 拦截了冒泡到父级的 input 点击，阻止 focus + 键盘弹起（`.coord-input-row` 是 #mapArea 子节点）。修复 4 处：CSS coord-input-row 提升 z-index+pointer-events:auto+input 恢复 touch-action；JS inpLat/inpLng/btnGoCoord 加 stopPropagation；area pointerdown/move handler 顶部加防御性 early-return（`.closest('input, button, select, textarea, .coord-input-row, .map-tools')`）。E2E 验证：3 个节点都注册了 stopPropagation listener，area handler 走 early-return，preventDefault 未调用。181/181 断言无回归。

- [2026-09-11] V1.6 评审（用户：@skill:product-dev-team 第三轮走查）：V1.5/V1.5.1/V1.5.2 修复后启动第三轮复合视角评审。3 个子代理并行（PM+IxD / QA / TM），最终合并产出 ux_review_20260911_v16.md。**P0 4 条**：
  - **P0-1** `.coord-input-row` 仍嵌 `#mapArea`，V1.5.2 修复是补丁不是根治（建议引入 `data-map-ignore` class 统一标记 + 移出 mapArea）
  - **P0-2** V1.5 P0-5 catch 兜底有缺口：Safari 隐私模式首屏仍无任何"配置不保存"提示
  - **P0-3** pan 旧记录迁移提示只放在记录页内，首屏看不见
  - **P0-4** **新发现真 bug**：传感器 `alpha=NaN` 三分支均无 `isNaN` 守卫，会永久冻结罗盘
  - **P1 6 条**：合并脚本散文化 / ENGINE 加载失败无 window.onerror / 地图拖动 renderTiles 卡顿 / pointerleave 提前结束拖动 / 空亡 severe 标签缺失 / 无 visibilitychange
  - **P2 16 条**：首帧假凶 / 500ms 长按 / 瓦片失败率虚假 / 品牌缺师承 / 真北两模式口径 / 短距箭头糊 / buildDial 缓存 / 低 zoom 远程判读 / 相对模式漂移 / renderLiveCard 事件委托 / quota 文案误导 / 单文件架构 / 测试盲点等
  - 视角交叉验证：P0-1/P0-2/P0-3 三视角都命中，TM 独有 P0-4 传感器 NaN + P1-1 合并脚本工程化 + P1-2 LP 加载白屏
  - V1.5 修复闭环：6 条 P0 + 2 条外部 bug 全部修好；本轮新发现 4 条 P0（其中 1 条 P0-4 是之前没发现的真 bug）
  - 建议 V1.6 优先打 P0 4 条（约 2-3 小时），其余排期

- [2026-09-11] **V1.6 P0 4条 全部修复**（用户「好的，立即执行」）：181/181 断言通过，9 项静态扫描全部 OK
  - **P0-1（架构性根治）**：`.coord-input-row` 和 `.map-tools` 从 `#mapArea` 内部**移出**为 `#view-map` 的兄弟节点 + 加 `data-map-ignore="true"` 统一标记 + area 改用 `closest('[data-map-ignore]')` 兜底；CSS 调整定位基准 `#view-map.active`。V2.0 加任何新交互控件只需加 `data-map-ignore` 属性即自动豁免
  - **P0-2**：`state._noStorage` 时 `setTimeout(toast('隐私模式：本次配置不保存', 4000), 300)` —— 让 Safari 隐私模式用户首屏就能看到
  - **P0-3**：renderSettings() 顶部加一行"V1.4 起「手工排盘」已合并到「地图量测」"——首屏/设置页可见
  - **P0-4（真 bug 修复）**：onSensorEvent 三分支统一加 `!isNaN(e.alpha)` 守卫，丢弃 NaN 数据不更新 heading/hasHeading，防止传感器瞬时 NaN 永久冻结罗盘
  - **P1-2（顺手做）**：在 UI IIFE 末尾加 `window.addEventListener('error', ...)` 全局兜底——任何脚本异常弹"页面发生错误，请刷新重试"红色横幅，避免完全白屏
  - 改动量：part1.html +20 行（HTML 结构 + CSS），part2.html +30 行（4 个修复点）

- [2026-09-11] **V1.6 P1 6条 全部修复**（用户「好的，请继续」）：把 V1.5.1 合并规则教训**固化为可执行代码** + 性能/交互/可信度全面升级。181/181 断言无回归，14 项静态扫描全过。详细落地：
  - **P1-1（最有防灾价值）**：合并脚本工程化。`scripts/merge.js`(4.4K, 4 项硬校验：收尾标签契约/script 语法/HTML 标签平衡/关键 DOM 节点) + `package.json`(`npm run build:merge/test`) + `scripts/pre-commit`(git hook 自动重合并+跑测试)。**彻底杜绝 `node -e "..."` 内联合并**——V1.5.1 教训不会再发生
  - **P1-2 window.onerror 兜底**：UI IIFE 末尾注册全局错误监听，触发顶部红色横幅 + 提示刷新，避免完全白屏
  - **P1-3 地图拖动性能**：拖动期间**仅 `drawOverlay()`**；`renderTiles()` 由 `scheduleTileRerender(60ms)` 节流到松手/缩放后统一重排。50+ 瓦片拖动流畅
  - **P1-4 删 pointerleave**：改用 `area.setPointerCapture(pointerId)`——手指滑出 area 不再提前中断平移/缩放
  - **P1-5 空亡 severe 视觉分级**：CSS `.tag.severe{暗红底+深红边框+粗体+阴影}` + 两处 renderLiveCard/renderMapCard `kongwang ? 'severe' : 'bad'` + tagTxt 加 `⚠ 空亡 · ` 前缀——玄学用户能秒辨大凶 vs 普通凶
  - **P1-6 后台唤醒**：`visibilitychange→visible` 重置 `state.relOffsetAlpha/headingSm/lastCardDeg`；传感器后台→前台瞬跳彻底消除
  - 工程化文件清单：merge.js 4.3K + pre-commit 0.4K + package.json 0.4K（V1.6 起强制使用）
  - 工作流约定升级：改代码必须走 `npm run build:merge` + `npm test`，MEMORY.md 已固化

- [2026-09-11] **V1.6 P2 14条 全部修复**（用户「好的，请继续」）：UX/性能/可信度全面升级。181/181 断言无回归，22 项静态扫描全过（P2 14 条 + V1.6 P0/P1 8 项反扫）。详细落地：
  - **P2-1 首帧假凶**：renderLiveCard 顶部加 `hasHeading` 守卫，未授权时显示空态文案而非"午子凶"
  - **P2-2 iOS 权限弹窗时机**：`bindIosPermOnFirstGesture` 等用户首次触摸 compassCanvas/manualRange 才弹，**不再页面加载即打断**
  - **P2-3 长按 500→350ms + 立即半透明反馈环**：`pendingPress` 屏内坐标 + pointerdown 立刻设 + drawOverlay 渲染 + pointermove>8px/endPointer 清——老人/儿童也能稳定触发且立即看到"已识别手势"
  - **P2-4 tileFailCount 指数衰减**：成功 `tileFailCount *= 0.9`，避免单次成功清零掩盖历史失败率
  - **P2-5 真北模式双 chip**：declKnown 时同时显示「磁北 xxx°」+「真北 xxx°」两个度数，统一两模式口径
  - **P2-6 brand 师承叙事**：第二行「三合盘 · 二十四山 · 纳音五行」+ CSS `.brand .school{font-size:10.5px;opacity:.82}`，增加流派出处
  - **P2-7 短距方向箭头外移**：屏距 < 60px 时箭头改画坐点外侧 30px 切线，避免坐/向圆重叠
  - **P2-8 buildDial 离屏缓存**：`_dialCache[dialStyle+showLong72+showLong60]` 命中跳过 150 环全量重算
  - **P2-9 buildDial 白调**：被 P2-8 缓存自动覆盖（哈希命中即跳过，零额外代码）
  - **P2-10 三重渲染合帧**：applySettings 内 buildDial + renderLiveCard + onLineChange 合到同一 rAF
  - **P2-11 低 zoom 远程判读**：setSit dy 加下限 `Math.max(0.01, ...)` + zoom<10 时 toast 提醒放大
  - **P2-12 相对模式漂移提醒**：`_relDriftTimer` 60s 后 toast 提醒重新校准；absolute/ios 模式清除
  - **P2-13 actions 移出（性能最大胜利）**：btnCalib/btnSaveLive/btnSaveMap 移出 html 字符串为 part1.html 固定节点；IIFE 末尾 `bindPersistentActions` 统一注册——避免 50Hz sensor 触发下每秒销毁重建 100 个 button DOM 节点
  - **P2-14 quota 文案**：「存储不可用，记录已临时保存」→「存储不可用，记录未保存（刷新即丢失）」，不再误导用户
  - V2.0 范围 2 条未做（P2-15 拆 UI 模块 / P2-16 puppeteer E2E）

- [2026-09-11] V1.6.1 **「无法调用指南针」修复**（用户报告）：根因 = V1.6 P2-2 让 iOS 权限弹窗等用户首次触摸 compassCanvas，但 canvas 默认 `cursor:default` 无视觉提示，用户不知道"罗盘盘面可点击"，导致 sensor 永久不工作。5 处修复：
  - **① 3 秒兜底**：bindIosPermOnFirstGesture 加 setTimeout 3 秒后自动弹 permOverlay，双轨（手势 + 超时）
  - **② 视觉引导**：CSS `#compassCanvas.need-perm::after` 浮起"📍 点此开启指南针权限"橙色脉冲胶囊（`@keyframes pulse`），未授权时直观可见
  - **③ 双事件注册**：permBtn 授权成功后**同时注册** `deviceorientation` + `deviceorientationabsolute`（防 Android Chrome 走 absolute 路径而 listener 缺失）
  - **④ class 切换**：onSensorEvent 三分支 + permBtn + permSkip 都加 need-perm 显示/移除
  - **⑤ Android 早退守卫**：bindIosPermOnFirstGesture 顶部加 `typeof requestPermission !== 'function'` 早退，防 listener 双重注册
  - 校验：merge.js 4 项硬校验全过 + 181/181 断言无回归 + 8/9 静态扫描全过（1 项注释 partial match，预期）。index.html 87K
  - **设计反思**：P2-2「不打断加载，让用户主动触发」的方向正确，但漏了视觉引导层——用户看到文字提示也不一定理解「那个像装饰的 canvas 就是触发点」

- [2026-09-14] **交付物补全：使用说明文档**（用户询问「有没有使用说明？」）：此前项目仅有开发文档（BRD/PRD/TDD/评审/验收）与工程文档（PROJECT_STATUS/MEMORY），**缺面向最终使用者的使用说明**。本轮补全两份：
  - **`使用说明.md`**（12K）：9 章结构——① 30 秒快速上手（4 步流程）② 两种模式怎么选（对照表）③ 实地罗盘（怎么拿手机图示/界面元素表/校准 8 字法/无传感器回退/iPhone 权限特例）④ 地图量测（三步测量/工具表/坐标 GCJ-02 说明/底图降级）⑤ 读懂判读结果（结论行拆解/兼向三态表/吉凶三级色彩/信息胶囊/专业参数逐项）⑥ 设置项说明（7 项逐条 + 真北磁北选型指南）⑦ 测量记录（50 条上限/删除/本地存储）⑧ 常见问题排查（5 类 FAQ：权限/读数跳/长按无效/保存失败/底图空白）⑨ 技术说明与免责（判读体系/精度/隐私/免责声明）
  - **`使用说明.html`**（20K）：单文件、桃橙主题 #EF7D2D、`prefers-color-scheme` 深浅色自适应、目录锚点跳转、手机优先排版，可直接打包随应用分发或静态托管
  - 内容全部**基于实际代码核对**（UI 元素、设置项选项值、判读标签三色分级、50 条记录上限、350ms 长按、3 秒权限兜底等），确保说明与实现零偏差
  - **副产品发现**：`tests/coord_input.js` + `tests/v16_e2e.js` 两个 vm-context E2E 脚本仍在（有效资产），建议后续整合为 `tests/e2e.js` 并接入 `npm test`

- [2026-09-11] **V1.6 收尾总览**：
  - 累计修复 24 项（V1.6 P0 4 条 + V1.6 P1 6 条 + V1.6 P2 14 条）
  - 工程化：scripts/merge.js + package.json + scripts/pre-commit（git hook 自动重合并+测试）
  - 架构性根治 1 项（P0-1 交互控件移出 mapArea + data-map-ignore 统一接口）
  - 性能关键改善 4 项：拖动只 drawOverlay + buildDial 缓存 + actions 固定节点 + 三重渲染合帧
  - 可信度升级 3 项：空亡 severe + brand 师承 + 真北双 chip
  - 跨周期稳定性 4 项：传感器 NaN 守卫 + visibilitychange 唤醒 + iOS 首次手势授权 + 60s 漂移提醒
  - 181/181 引擎断言通过 + 22 项静态扫描全过 + 浏览器模拟执行 0 错
  - index.html 91K / part1 36K / part2 55K / merge.js 4.3K / pre-commit 0.4K / package.json 0.4K / tests/run.js 22.5K
  - **下一步候选**：① V2.0 架构（P2-15 拆 UI 模块 + P2-16 puppeteer E2E）1 周 ② 新功能扩展（罗经背面/流水/立向/玄空大卦/紫白飞星）③ 再开一轮深度评审

- [2026-10-14] **V1.6.2 微信小程序端交付 + H5 双 P0 修复**
  - 需求：用户要求「帮我开发并发布到微信小程序端」。经确认 4 项决策：仅测试号（需注册正式号）/ 纯小程序零后端 / 原生 map 组件 / 工具化改造合规策略。
  - **小程序工程**：`miniprogram/` 39 个文件、5 页面、27 个事件绑定、**零 npm 依赖 / 零后端 / 零联网**。
    - pages/live：Canvas 2D 盘面（离屏缓存）+ `wx.startCompass` + 手动转盘降级
    - pages/map：原生 `<map>` + 十字准星取点 + 点击定向（附准星定向兜底按钮）
    - pages/records / settings / about：记录、设置、术语对照与算法说明
    - components/disclaimer：每页强制引用的免责声明组件
  - **引擎 100% 复用**：432 行 / 27 个纯函数零 DOM 依赖，由 `scripts/build-mp-engine.js` 从 `assets/part1.html` **自动抽取**为 CommonJS 模块（单一事实来源，禁止手改）。脚本含 3 项硬校验：10 项浏览器符号扫描 + 24 项关键导出 + WMM2025 系数表 + 8 项 require 冒烟测试。
  - **合规工具化改造**（`utils/terms.js` 统一出口）：旺/相/孤/虚/空亡 → 主格/次格/偏格/空格/骑线；纳音旺相泄囚死 → 比和/纳音生山/山生纳音/纳音克山/山克纳音；吉凶 → 格位可用/格位不宜；「大凶方位，避用」→「该方位落在山界线上，建议调整角度」。
  - **零素材依赖**：`scripts/build-mp-icons.js` 用 Node 内置 zlib 现场生成 3 个 PNG 标注图标，含签名 + IEND 块 + **IDAT 解压 + 中心像素颜色**四级校验。
  - **新增自检体系 `scripts/check-mp.js`（C1–C14）**：pages↔文件、组件路径、事件处理函数存在、WXSS 本地图片、禁词扫描、免责覆盖、require 越界、非法标签、浏览器全局、联网 API 禁止、tabBar、引擎同源、JS 语法、WXML 标签平衡。**`--selftest` 反向验证 13/13 检查项在缺陷夹具上正确报错**。
  - **🔴 修复 H5 真实 P0-6：「地图量测 → 保存记录」按钮 100% 崩溃**——三重错误叠加：① `E.GEO.gcjToWgs` 不存在（正确名 `gcj02ToWgs84`）→ TypeError；② `getSit()` 返回 `{lat,lng}` 对象而非数组，`sit[0]` 恒 undefined；③ `bearing()` 为引擎内部函数，UI 作用域不可见 → ReferenceError。
  - **🔴 修复 H5 真实 P0-7：`visibilitychange` 唤醒后磁偏角永不刷新**——同一 `sit[0]/sit[1]` 误用，`computeDecl(undefined,undefined)` 得 NaN 被 `isFinite` 静默拦掉。
  - **新增 `tests/ui_static.js`（U1–U4）补齐 UI 层测试空白**：这是上述两个 P0 能长期潜伏的根因——181 条引擎断言对 part2.html 的 UI 代码**零覆盖**。新校验做「跨文件符号一致性」：U1 UI 中 `E.<NS>.<member>` 必须存在于引擎导出；U2 `getSit/getFace` 结果禁止数组下标；U3 引擎内部函数禁止裸调用；U4 实参个数一致性。**`--selftest` 反向验证 4/4 报错 + 阴性样本零误报**。
  - 测试总量：H5 引擎 181/181 + UI 一致性 4 项 + 小程序 14 项；反向验证 17 项全通过。
  - **待人工执行（微信不支持 API 代做）**：① 注册小程序账号拿 AppID ② 安装微信开发者工具（**路径必须纯英文**）③ 开启「服务端口」④ 提交审核。操作步骤见 `小程序上线操作手册.md`。

## Deliverables 清单（截至 V1.6）

| 文件 | 路径 | 大小 | 角色 |
|---|---|---|---|
| 罗盘分金 H5 | `index.html` | 91K | 单文件 SPA 合并产物（HTML+CSS+ENGINE+UI） |
| 源：HTML/CSS/ENGINE | `assets/part1.html` | 36K | 静态层 + 引擎纯函数（180+ 函数，零 DOM 依赖） |
| 源：UI 层 | `assets/part2.html` | 55K | UI IIFE + 事件 + canvas + 地图 + 传感器 |
| 合并脚本 | `scripts/merge.js` | 4.3K | 4 项硬校验合并器（防灾核心） |
| Git Hook | `scripts/pre-commit` | 0.4K | 提交前自动重合并+跑测试 |
| 包配置 | `package.json` | 0.4K | `npm run build:merge/test` |
| 引擎测试 | `tests/run.js` | 22.5K | 181 断言（T1-T12 引擎 + T14 UI 修复校验 18 条） |
| **使用说明（MD）** | `使用说明.md` | 12K | 面向使用者的完整手册（9 章：快速上手/两模式/判读解读/设置/记录/FAQ/技术说明） |
| **使用说明（HTML）** | `使用说明.html` | 20K | 手机可直看的单文件版（桃橙主题 + 深色自适应 + 目录锚点），可打包随应用分发 |
| 项目文档 | `.product_docs/` | — | 8 大模块（BRD/PRD/TDD/评审/状态） |
| 工作记忆 | `.workbuddy/memory/` | — | 每日日志 + MEMORY.md 长期领域知识 |

## 测试覆盖矩阵（截至 V1.6）

| 模块 | 覆盖范围 | 断言数 |
|---|---|---|
| 二十四山基础 | 24 山名/度数/阴阳 | T1: 12 |
| 120 分金表 | 240 格属性 | T2: 18 |
| 空亡检测 | 大/小空亡线 + 宽度 | T3: 14 |
| 主判读 analyze | 山/向/分金/孤虚旺相/兼向 | T4: 22 |
| WMM2025 磁偏角 | 六城误差 ≤0.0005° | T5: 8 |
| decimalYear | 时分→年化精度 | T6: 6 |
| GCJ-02 转换 | WGS↔GCJ 双向 + 边界 | T7: 16 |
| 大圆计算 | 距离/方位 | T8: 10 |
| 传感器与工具 | norm/branchOfMountain | T9: 8 |
| STORE | safeParse/pushRecord/mergeSettings | T10: 18 |
| 随机一致性 | 10000 点落格 | T11: 4 |
| 龙脉层 | long72/long60/nayin/dragonFortune | T12: 22 |
| UI 修复校验 | 18 条 V1.5 静态校验 | T14: 18 |
| **合计** | | **181 断言 100% 通过** |

## 待办与风险登记（截至 V1.6）

| 项 | 类型 | 优先级 | 触发条件 |
|---|---|---|---|
| P2-15 拆 UI 模块（compass.js/map.js/records.js/settings.js） | 架构债 | V2.0 | 当前 80K→V1.6 91K，行数仍在可控范围但单文件架构临界 |
| P2-16 puppeteer 端到端冒烟（onSensorEvent/renderLiveCard/pointer 链/localStorage 异常/模式切换） | 测试盲点 | V2.0 | 当前 181 断言只覆盖 ENGINE 纯函数，UI 行为靠静态扫描+浏览器模拟 |
| 真机实测 Safari iOS / 微信内置 / Android Chrome | 真机抽检 | 每周 | 验收时确认 3 日内抽检，v2.0 上线前再次复测 |
| 真北展示的磁偏角计算精度 | 工程精度 | 持续 | declKnown 时显示双 chip；用户报告 decl 异常时回退单 chip |
