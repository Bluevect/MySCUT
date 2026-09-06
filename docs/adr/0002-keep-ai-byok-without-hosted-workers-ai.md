# ADR 0002：AI 保持 BYOK，不建设维护者托管的匿名 Workers AI 网关

## 状态

Accepted（2026-08-30，维护者裁定：No-Go，先不建设公共 Workers AI 服务；保留 BYOK）

本次决策验证的时间盒是 2026-08-30 的一次仓库边界与 Cloudflare 官方文档评审会话，不创建原型、不使用真实用户数据。维护者在结论评审后确认停止继续验证并接受本 ADR。

## 背景

MySCUT 是公开源码、无账户、隐私优先的本地客户端。现有 AI 边界是用户自行配置 OpenAI 兼容 Base URL、API Key 和模型，请求直接发往用户选择的服务商；维护者不持有共享服务密钥，也不运营 AI 代理。

issue #14 评估了由维护者部署 Cloudflare Worker，并通过 Workers AI 向匿名客户端提供公共推理能力的可行性。完整客户端源码公开，客户端不能保存项目级秘密，也不能充当可信认证边界；隐藏端点、CORS、应用签名或客户端生成的安装标识都不能阻止第三方直接调用 Worker。

### 平台与成本依据

以下信息于 2026-08-30 对照 Cloudflare 官方文档核验：

- Workers AI Free 与 Paid 计划每天都有 10,000 Neurons 免费额度；Paid 超额按每 1,000 Neurons 0.011 美元计费，Free 超额后请求失败。详见 [Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)。
- 文本生成默认账户级限制为 300 请求/分钟，部分模型另有限制。该限制保护平台容量，不构成项目成本或用户身份边界。详见 [Workers AI Limits](https://developers.cloudflare.com/workers-ai/platform/limits/)。
- 以 `@cf/meta/llama-3.2-3b-instruct`、每次 2,000 输入 token 与 500 输出 token 为示例，一次请求约消耗 24.5 Neurons，每日免费额度仅约覆盖 400 次请求；匿名攻击者可在平台速率限制内快速耗尽全天额度。实际消耗随模型和上下文变化。
- Workers AI 的 OpenAI 兼容 REST API 需要 Cloudflare Account ID 与 API Token。这些凭据不能放入公开客户端，因此公共能力必须经过维护者控制的 Worker 代理。详见 [OpenAI compatible API endpoints](https://developers.cloudflare.com/workers-ai/configuration/open-ai-compatibility/)。

### 威胁与滥用模型

公共 Worker 面临以下不依赖官方客户端的调用方式：

- 从仓库、网络请求或应用包中取得端点后直接构造请求；
- 修改请求体以放大输入、输出或并发，消耗推理额度；
- 轮换 IP、代理或客户端标识，绕过简单的单 IP/单安装限制；
- 先耗尽免费额度造成全体用户拒绝服务，或在 Paid 计划上把滥用转化为维护者账单。

校园网和运营商 NAT 会让许多正常用户共享出口 IP，严格 IP 配额容易误伤；宽松配额又无法阻止分布式调用。没有账户、学校 SSO 或其他可信身份时，无法建立可靠的逐用户额度。

### Turnstile 判断

若未来重新评估公共端点，Turnstile 必须作为前置或风险触发验证，并在服务端调用 Siteverify；客户端验证本身无效。Turnstile token 五分钟过期且只能使用一次，详见 [Turnstile server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)。

Turnstile 只能提高自动化成本，不能建立用户身份，也不能阻止第三方运行真实挑战后调用公开端点。在 WebView/原生壳中引入挑战还会增加加载失败、网络兼容和无障碍成本。因此它是“必需但不充分”的控制，不足以改变本次 No-Go 结论。

### 隐私与数据流

公共代理会让提示词、课表摘要和生成结果离开设备，经维护者 Worker 与 Cloudflare 处理。Cloudflare 声明不会在未经明确同意时使用 Workers AI Customer Content 训练模型或改进服务，也不会向其他客户提供；配合 R2、KV、Durable Objects 或 Vectorize 时可能发生内容存储。详见 [Workers AI Data Usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/)。

即使应用不记录请求正文，维护者仍会成为一项用户内容中转服务的运营方，需要维护隐私披露、日志策略、滥用处理和供应商条款。该职责超出当前“课表与凭据默认留在设备、本项目不运营 AI 代理”的边界。

## 决策

**No-Go：不建设、不部署由维护者托管或付费、供匿名 MySCUT 客户端使用的公共 Workers AI 网关。**

- AI 调用继续使用 BYOK：用户在本地配置自己的 OpenAI 兼容服务、凭据与模型，费用和服务关系归用户所有。
- Workers AI 可以作为一种 BYOK 服务：用户可填写自己 Cloudflare 账户的 OpenAI 兼容地址和 API Token；项目不提供共享 Cloudflare 凭据。
- 不部署 Turnstile、公共 Worker、共享 API Key、公共额度或相关持久化设施。
- 不创建本议题的实现任务，也不发布此前未创建的原型。
- 核心课表功能不依赖任何 AI 服务；用户未配置、额度耗尽或上游不可用时，仅 AI 能力不可用。

### 重新评估的触发条件

只有以下条件同时具备时才重新评估维护者托管的 AI 能力：

1. 有可信账户、学校 SSO 或等价的服务端用户身份与撤销机制；
2. 有可验证的全局请求/token 上限、预付或硬成本上限、自动停服开关和明确的维护预算；
3. 有正文最小化、禁止内容日志、保留期、用户同意和供应商条款审查；
4. 现有最多三名维护者能够长期承担监控、滥用响应、密钥轮换、模型迁移与事故处置职责；
5. 产品价值足以补偿 Turnstile/登录、服务不可用和内容离开设备带来的体验与隐私成本。

## 后果

- **收益**：没有匿名账单与额度耗尽风险；不新增在线服务、共享秘密、用户内容中转和运维值班；保持本地优先与开放客户端边界。
- **成本**：用户需要自行准备兼容服务与凭据，首次配置门槛较高；无法提供开箱即用的免费 AI 体验。
- **兼容性**：现有 OpenAI 兼容 BYOK 路径继续保留，未来可单独改善模型配置、服务商说明和错误提示，但不得隐式引入维护者托管代理。

## 替代方案

- **匿名公共 Workers AI Worker**：实现简单，但公开端点可被直接调用，平台速率限制不是成本控制；拒绝。
- **Turnstile + IP 限流的公共 Worker**：能降低部分自动化流量，但不能建立身份，且校园 NAT 与代理网络使误伤和绕过同时存在；拒绝。
- **Free 计划作为硬成本上限**：不会产生超额账单，但攻击者可以耗尽全天额度造成公共 AI 长时间不可用，维护者仍承担隐私与运维职责；拒绝。
- **BYOK（当前方案）**：项目不承担共享额度和供应商关系，用户可自由选择 OpenAI 兼容服务，包括自己的 Workers AI 账户；采纳。
