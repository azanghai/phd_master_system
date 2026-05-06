## Plan: 再次重构蓝图（小步高收益）

在不立即迁移框架的前提下，先做一轮低风险小步重构，优先提升性能与流畅度，并继续瘦身界面文案与结构噪音。方案以“先蓝图后实施”为节奏：先固化改造顺序、验收标准与回滚策略，再进入分批落地。虽然你允许未来框架迁移，但本轮不触发迁移实施，只预留迁移接口与目录边界。

**Steps**
1. Phase 0 基线冻结（阻塞后续）
   1) 记录当前可发布基线：构建命令、同步命令、关键页面截图、核心交互录像。
   2) 建立回滚锚点：按功能域划分后续提交边界，确保每一步都可独立回退。
2. Phase 1 性能优先清理（可并行执行）
   1) 轨道A（并行）：梳理并删除无效或重复资产引用，收敛模板与运行时重复定义，减少首屏解析负担。
   2) 轨道B（并行）：提取重复样式与内联样式热点，降低样式计算和重绘成本。
   3) 轨道C（并行）：审查事件绑定热点，建立委托入口设计稿，先不改行为只改结构准备。
3. Phase 2 UI继续瘦身（依赖 Phase 1）
   1) 统一清理“过程性说明/叙述性提示/重复引导”残留文案。
   2) 保留必要状态信息，删除非执行必需文本，保证页面密度与操作可达性。
   3) 按模块列出“保留/删除”清单，避免回归添加。
4. Phase 3 交互流畅度增强（依赖 Phase 1）
   1) 重排渲染顺序：优先首屏关键区块，延后非关键区块渲染。
   2) 优化导航切换时的DOM更新粒度，减少整段重绘。
   3) 对高频操作（任务、打卡、切换视图）建立轻量性能预算指标。
5. Phase 4 同步链路稳态检查（可与 Phase 2 部分并行）
   1) 验证模板源文件到 app 与 Android public 产物一致性，防止“改了被覆盖”。
   2) 固化单一路径的发布检查单，避免中间产物干扰验收。
6. Phase 5 可测试性与守护（依赖 Phase 2/3/4）
   1) 定义最小回归集：导航、任务、打卡、同步、设置项（含桌面常驻）。
   2) 增加轻量自动化检查入口（构建+关键路径冒烟）。
   3) 建立“性能退化阈值”与“文案回归阈值”两类验收门。
7. Phase 6 未来框架迁移预留（最后执行，不改栈）
   1) 仅做边界定义：按 domain 与 sync 分目录职责，抽离可迁移接口层。
   2) 产出迁移就绪清单（若未来进入 Vue/React，可直接承接）。

**Relevant files**
- d:/skills/phd_master_system/博士工作台_整合打卡逻辑优化版_fix5_sidebar_trim.html — 模板源入口，发布时会覆盖运行时页面，需作为文案与结构瘦身主改点。
- d:/skills/phd_master_system/app/index.html — 运行时页面与 Android 复制源，需和模板保持一致验收。
- d:/skills/phd_master_system/app/scripts/navigation.js — 导航切换、侧栏与首屏切换性能的主要入口。
- d:/skills/phd_master_system/app/scripts/domain-renderers.js — 各业务域渲染顺序与渲染粒度优化重点。
- d:/skills/phd_master_system/app/scripts/bindings.js — 事件绑定热点，后续事件委托改造入口。
- d:/skills/phd_master_system/app/scripts/state-migration.js — UI状态默认值与兼容映射，避免重构引发路由/状态回退。
- d:/skills/phd_master_system/app/sync/engine.js — 同步流程核心，需做稳态验证与异常路径回归。
- d:/skills/phd_master_system/package.json — 构建、同步与后续冒烟命令入口。
- d:/skills/phd_master_system/scripts/prepare-static.mjs — 模板到产物的关键转换链路。

**Verification**
1. 命令级验证
   1) npm run prepare:static
   2) npm run build:css
   3) npm run cap:sync:android
2. 功能级冒烟
   1) 首页与关键域切换是否流畅、无白屏和错位。
   2) 文案瘦身后是否仍能完成任务创建、打卡、研究/论文入口操作。
   3) 桌面常驻设置是否可保存、可恢复、跨重启一致。
3. 产物一致性验证
   1) 对比模板、app页面、android public 页面关键片段一致性。
   2) 仅以 android/app/src/main/assets/public 作为交付验收对象。
4. 回归门槛
   1) 首屏体感与切换耗时不劣化。
   2) 不允许恢复已删除的过程性文案。

**Decisions**
- 已确认重构深度：A 小步重构。
- 已确认优先目标：性能与流畅度、UI继续瘦身。
- 已确认交付节奏：M3 先输出完整蓝图再实施。
- 已确认技术边界：本轮不做框架迁移实施，但预留迁移边界。
- Included scope：前端结构瘦身、渲染与交互性能、发布链路一致性、最小回归守护。
- Excluded scope：Tauri/Rust后端重写、同步协议重写、跨平台架构重建、数据库迁移。

**Further Considerations**
1. 性能指标口径
   1) Option A：主观体感+关键操作耗时记录（最快落地）。
   2) Option B：引入轻量打点并输出固定报表（更可比较）。
2. 文案瘦身策略
   1) Option A：继续按句删除（风险低、速度快）。
   2) Option B：建立统一文案策略表后批量收敛（一致性更高）。
3. 未来迁移方向
   1) Option A：保持原生栈长期演进。
   2) Option B：下一阶段转 Vue 3 + TS（推荐作为后续单独项目）。