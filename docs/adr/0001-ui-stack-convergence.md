# ADR 0001：移动端 UI 栈收敛至 Konsta UI + Tailwind，移除 antd

## 状态

Accepted（2026-08-24，决策调研与评审经 issue #6 与对应 PR 完成）

## 背景

仓库同时存在三套样式体系：antd（组件库）、Konsta UI（移动端质感，目前仅用于底部 Tabbar 与 App 壳）、Tailwind（零散工具类）+ 自有 CSS 变量主题。长期并存带来包体积、cssinjs 运行时成本与视觉不一致的维护负担。

### antd 使用面盘点（2026-08-24，基于 `origin/main`）

全部 12 个使用文件均为移动形态，应用不存在桌面专属页面（Web 构建渲染同一套移动 UI）：

| 组件 | 使用处 | chunk 位置 |
| --- | --- | --- |
| ConfigProvider + theme | GlobalThemeProvider（全局主题） | **主 chunk（首屏关键路径）** |
| Alert / Button | StorageRuntimeProvider（存储降级横幅） | **主 chunk（首屏关键路径）** |
| ButtonProps 类型 | CircleIconButton / RoundedSquareIconButton 自定义包装 | **主 chunk（首屏关键路径）** |
| @ant-design/icons（5 个图标） | App Tabbar、课表页、手册页等 | **主 chunk（首屏关键路径）** |
| message（8 处） | 各页全局提示 | 懒加载 chunk |
| Modal（5 处） | 课表详情/保存确认、交集保存、导入确认等 | 懒加载 chunk |
| Input（5 处） | 命名/搜索表单 | 懒加载 chunk |
| Switch（2 处）/ Select（2 处）/ DatePicker（1 处）/ Checkbox（1 处） | 设置页表单 | 懒加载 chunk |

### 性能依据（docs/PERF_BASELINE.md，2026-08-16 基线）

- 主入口 chunk 421 KiB raw / 139.7 KiB gzip，首屏关键路径；react-dom + antd + cssinjs 全量在内，Lighthouse `unused-javascript` 估算主 chunk 可省约 43 KiB gzip。
- antd 传递依赖（dayjs、rc-select、rc-dialog、rc-picker、rc-field-form 等）与 cssinjs 运行时样式计算是低端 Android WebView 启动长任务（最长 172 ms）的组成部分。
- 移动端 LCP 6.7 s 中主 chunk 是除 sql-wasm 外最大的可优化 JS 项。

## 决策

**采用方案 C：完全迁移至 Konsta UI + Tailwind + 既有 CSS 变量主题，移除 antd**，分阶段执行；过渡期内立即执行方案 B 的规则——新 UI 一律使用 Konsta/Tailwind，不再新增任何 antd 引用。

分阶段计划（每阶段独立可合入、可验证）：

1. **阶段一：antd 移出首屏关键路径。** GlobalThemeProvider 去 ConfigProvider（全局主题已由 CSS 变量承载，antd token 仅剩少数组件消费）；StorageRuntimeProvider 横幅改为自有样式组件；Tabbar 图标改为内联 SVG；删除 `antd/dist/reset.css` 的关键路径依赖（按需保留最小 reset）。
2. **阶段二：懒加载页面逐页迁移。** message → 轻量 toast 组件（Konsta Toast 为组件形态，需自建极简全局 API）；Modal → Konsta Dialog/Sheet；Input → ListInput；Switch → Toggle；Select → 移动端选择交互（Actions/Sheet/Segmented 模式）；Button → Konsta Button；Checkbox → Konsta Checkbox。
3. **阶段三：收尾移除。** DatePicker（仅学期开始日期一处）改为日历 Sheet 或原生日期输入；移除 `antd`、`@ant-design/icons` 依赖及 dayjs 等传递依赖；清理 reset.css 与遗留样式。

出口判据：`grep -r "from 'antd'" src` 为零；主 chunk gzip 较基线（139.7 KiB）显著下降（目标 < 100 KiB）；`npm run check` 与真机烟雾通过；按 PERF_BASELINE.md 口径复测回填对比数据。

## 后果

- **收益**：单一 UI 体系与一致的原生移动质感；主 chunk 减去 antd/cssinjs/dayjs/rc-*（估算 -40~50 KiB gzip 与部分启动长任务）；消除 cssinjs 运行时开销；依赖面显著缩小。
- **成本与风险**：约 12 文件、10 类组件的替换工作量；Konsta 无 DatePicker 等重表单组件，个别交互需自建（选择器、日期）；设置页表单存在交互回归风险，由逐页迁移与真机烟雾缓解；迁移期间新旧页面短期视觉混杂。
- **约束**：迁移期间 antd 只减不增；每阶段合入后按基线口径复测性能；若阶段二发现 Konsta 无法覆盖某交互且自建成本过高，允许在 ADR 中追加记录单点例外（需说明理由），但不推翻整体方向。

## 替代方案

- **A. 维持现状（移动端继续 antd）**：零迁移成本，但 antd 桌面取向与纯移动产品形态长期错配，cssinjs 与 rc-*/dayjs 依赖持续占据首屏关键路径，三套体系并存的维护负担只增不减。否决。
- **B. 新 UI 一律 Konsta/Tailwind，antd 保留给桌面形态或既有页面**：因应用不存在桌面专属形态，antd 实际没有保留区，等于旧页面永久双轨；且 GlobalThemeProvider/StorageRuntimeProvider 位于组件树根部，antd 仍整体留在主 chunk，性能目标无法达成。作为过渡规则并入决策，不作为终态。否决（作为终态）。
