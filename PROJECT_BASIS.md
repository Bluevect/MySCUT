# PROJECT_BASIS

## 产品目标

MySCUT 是一个非官方、隐私优先的跨平台校园工具，当前核心职责是：

- 在用户设备本地导入、管理和展示课表；
- 为 Android、iOS 和 HarmonyOS 手机提供尽可能一致的核心能力；
- 在应用中呈现独立维护的 `survive-in-scut` 校园手册；
- 保持核心逻辑可测试，并降低未来替换平台 UI 的成本。

## 团队与演进原则

项目按最多约 3 人的小团队维护能力设计，当前处于快速演进阶段。优先采用简单、直接、可理解、可维护且足以解决当前问题的方案，避免过度抽象、过度防御和重复建设。只有在出现真实重复、第二个实际实现或明确维护痛点时才增加长期抽象，不为假设性的未来需求预建框架或基础设施。

## 产品平台边界

产品目标与实现状态分开描述，正式产品目标不代表所有能力已完成适配：

- Android 手机：主要发布平台，使用 Capacitor；当前独占登录教务系统后自动读取课表的能力。
- iOS 手机：正式产品目标，当前支持构建与同步，需要 macOS、Xcode 和签名环境；尚不支持 Android 独占的自动教务导入。
- HarmonyOS 手机：正式产品目标，当前由实验性的 OpenHarmony WebView 工程承载；实现与验证状态见 [OHOS_RUNBOOK.md](docs/OHOS_RUNBOOK.md)。
- Web 与 PWA：用于开发、兼容和辅助分发，不是一等产品目标；部分原生教务导入能力不可用。
- PC 与桌面端：不在当前发行和 UI 适配范围内；后续宽屏优化优先面向 Pad。

Android 正式版需要兼容校园网教务入口的 HTTP 访问。这是已知外部系统的兼容要求，不代表其他网络目标可以不受约束地使用 HTTP。

平台差异应通过适配层处理，但只为已存在的真实平台差异建立抽象，不为尚无第二个实现的假设能力提前建设通用框架。不得把 DOM、Capacitor、SQLite 或系统 API 细节扩散到领域逻辑。

## 客户端与服务边界

客户端代码与核心能力保持全开源，产品坚持本地优先，不运营常驻重后端。必要的服务端能力限于静态分发或职责明确、低运维的简单 serverless 服务，可使用 Cloudflare、Vercel 等平台的 hobby 级能力；核心业务状态或用户本地数据不得依赖后端。

公开客户端不能保存项目服务秘密，也不能被视为可信的认证边界。引入新的服务端能力前，必须确认其滥用、成本、隐私和维护负担能够由当前团队持续承担。

项目不运营账户、云同步、遥测或由维护者托管或付费的公共 AI 代理服务。AI 调用保持 BYOK，由用户在本地配置自己的兼容服务与凭据；只有具备可信身份、硬成本上限和新的隐私决策时才重新评估公共代理，详见 [ADR 0002](docs/adr/0002-keep-ai-byok-without-hosted-workers-ai.md)。

## 交付原则

CI 保持轻量，覆盖依赖一致性、类型检查、必要测试、主应用构建、文档与公开数据检查，以及必要的发布门禁。原生构建和设备烟雾测试按变更范围及发布需要执行，具体命令和要求以 [AGENTS.md](AGENTS.md) 与 [CONTRIBUTING.md](CONTRIBUTING.md) 为准。不为追求全平台矩阵或企业级合规而引入超出团队维护能力的厚重流水线。

## 架构边界

- `src/core/`：平台无关的领域模型、转换、校验和用例。
- `src/features/`：按功能组织 UI、页面状态与装配逻辑。
- `src/platform/`：浏览器、Capacitor、持久化和平台生命周期适配。
- `src/services/`：更新检查等外部 I/O 边界。
- `src/components/`：跨功能复用的展示组件。
- `src/generated/`：由脚本生成且可重复构建的源码。

UI 组件负责渲染和交互分发；复杂业务规则、持久化和外部请求必须位于可测试的逻辑或适配模块中。类型边界使用显式类型和 `unknown` 收窄，避免 `any`。

## 数据职责

- 课表、头像、设置和可选 AI 服务凭据默认只保存在当前设备。
- 教务导入只在用户主动发起时访问用户选择的目标，并将 Cookie 限制在该会话和目标站点语义内。
- 仓库中的 fixture 必须完全合成，使用明确的 `TEST-*` 标识。
- 浏览器或平台专属存储必须实现 `src/core/storage` 定义的契约；领域模块不直接依赖具体数据库。

## 手册职责与授权边界

`external/survive-in-scut` 是独立上游 Git 子模块。主仓负责固定提交、构建集成和清晰披露边界，不替上游修改内容或解决授权冲突。MySCUT 的 MIT 许可证不覆盖该子模块；分发要求见 `THIRD_PARTY_NOTICES.md`。

## 权威技术参考

- React: https://react.dev/reference/react
- Ant Design: https://ant.design/llms.txt
- Vite: https://vite.dev/llms.txt
- Capacitor: https://capacitorjs.com/docs
- OpenHarmony: https://developer.huawei.com/consumer/cn/doc/
- Konsta UI: https://konstaui.com/react
