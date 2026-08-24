# ADR 0001：移动端 UI 栈维持现状（antd 为主），暂不做收敛迁移

## 状态

Accepted（2026-08-24，维护者裁定：方案 A，先不改；决策依据为本 ADR 的使用面盘点与性能基线数据）

## 背景

仓库同时存在三套样式体系：antd（组件库）、Konsta UI（移动端质感，目前仅用于底部 Tabbar 与 App 壳）、Tailwind（零散工具类）+ 自有 CSS 变量主题。issue #6 提出需要明确收敛方向，并完成了如下调研。

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

**采用方案 A：维持现状，移动端继续使用 antd，不启动收敛迁移。**

执行解读（维持现状的自然含义，不引入新规则）：

- 新增 UI 默认继续使用 antd，与既有页面保持一致；Konsta 维持现有引入范围（Tabbar 与 App 壳），既不扩大也不移除；Tailwind 维持零散工具类用途。
- 不设"antd 只减不增"或"新 UI 必须用 Konsta"之类约束——本决策即约束：保持 antd 单一主线，避免体系继续摇摆（此前 Konsta Tabbar 曾引入、回退、再引入）。

### 重新评估的触发条件

以下任一出现时，基于本 ADR 固化的盘点与基线数据重新评估 B/C：

1. 低端 Android WebView 真机数据或用户反馈表明启动/交互性能已构成实际体验问题（如主 chunk 继续增长超过约 160 KiB gzip，或启动长任务显著恶化）；
2. antd 大版本升级造成破坏性迁移成本，或 cssinjs/依赖面维护负担显著上升；
3. 产品需要大量新移动表单页，antd 桌面取向的交互短板成为主要痛点。

重评时应优先复用本文档的盘点结论，仅增量更新使用面数据。

## 后果

- **收益**：零迁移成本与零回归风险；组件能力完整（DatePicker/Select 等重表单无需自建）；UX 与现状完全连续。
- **成本**：antd + cssinjs + dayjs + rc-* 继续留在首屏关键路径（unused-js 估算约 43 KiB gzip 暂不减）；三套体系并存的维护负担与视觉不一致继续存在；后续若走 C，迁移规模只会更大。
- **已固化的资产**：使用面清单与性能数据记录于本 ADR，将来重评无需从零调研。

## 替代方案

- **B. 新 UI 一律 Konsta/Tailwind，antd 保留给桌面形态或既有页面**：应用不存在桌面专属形态，antd 没有实际保留区，等于旧页面永久双轨且视觉割裂加剧；同时根部 Provider 仍使 antd 留在主 chunk，性能无收益。未采纳。
- **C. 分阶段完全迁移至 Konsta/Tailwind 并移除 antd**：长期收益明确（主 chunk 估算 -40~50 KiB gzip、消除 cssinjs 运行时、单一体系），但需要替换 12 个文件、10 类组件并自建 DatePicker 与全局 toast，回归风险集中在设置页表单。维护者判断当前性能与维护负担尚可接受，迁移成本与风险暂不值得承担；作为重评时的首选候选保留在记录中。未采纳（现阶段）。
