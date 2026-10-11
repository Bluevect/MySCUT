# ADR 0004：stable 发版 bump 阶段上移 CI，以 bump PR 落地

## 状态

Accepted（2026-10-11）

## 背景

ADR 0003 将 stable 发版拆为「本地 bump + CI 发布」两阶段，但 bump 阶段仍要求维护者本地具备完整环境（Node、gh auth、与 repo secrets 一致的 `R2_ENV`），并以个人凭证直接向 main 推送 bump commit 与 tag。这是发版流程中最后一段无法委托、无法在 Actions 内审计的本地操作。ADR 0003 曾拒绝「CI 自己推回 bump commit」，理由是需要为 GitHub Actions 配置 main 的 ruleset bypass，形成长期权限豁免。

## 决策

1. bump 阶段改由 Release Bump workflow（workflow_dispatch，输入版本号、release note、可选 minVersion）执行：在 `release/vX` 分支生成 bump commit 并创建 PR；重跑时 force-with-lease 覆盖同名分支并复用已有 PR。脚本复用 `prepare.mjs`，新增 `--pr` 模式，与本地应急路径共享全部校验与文件改动。
2. 合并 bump PR 是维护者对发版的认可动作，替代原「本地推 main + tag」。Actions 仅推送普通分支 `release/*` 与 tag，仍不推 main，不引入 ruleset bypass、PAT 或 GitHub App 凭证。
3. Stable Release workflow 新增 main push 触发（paths: `package.json`）：tag job 校验 `package.json` 与 `versions.json` 的版本一致后，在 main HEAD 打 tag 并推送（tag 已存在或版本不一致则跳过并告警）；release job 照旧经 environment `release` 审批后从 tag 构建、签名并发布。tag 语义从「维护者本地打」变为「合并后 CI 在 main HEAD 打」，HEAD 与 tag 漂移由 `ci.mjs` 既有的 tag 树检出逻辑兜底。
4. release note 支持两种来源：预提交到 main 的 `.release-notes/vX.md`（维持既有习惯），或 workflow_dispatch 输入（多行经 `gh workflow run` / API 传入，UI 输入框为单行，输入内容优先于预提交文件）；发布失败时以原版本号重新 dispatch 即可重试。
5. 本地 `release:bump`（直推 main + tag）降级为应急路径，行为不变。

## 后果

- 发版全程在 Actions 内完成、可审计；维护者正常发版不再需要本地 `R2_ENV` 与 gh auth（仅应急路径需要）。
- 「package.json 版本变化落到 main」即视为发版意图。非 bump 来源的版本变化会因 `versions.json` 版本不一致被 tag job 跳过并告警；发版密钥仍只经 environment 审批解锁。
- tag 打在合并后的 main HEAD 而非 bump commit 本身，以兼容任意合并策略（merge commit / squash / rebase）；合并与打 tag 之间 main 的新提交会一并进入 tag 树，发布构建以 tag 树为准。
- 新增可被 force-with-lease 覆盖的 `release/*` 分支命名空间；该命名空间不得纳入分支保护。
- release note 的多行输入优先预提交 `.release-notes/vX.md` 到仓库；临时输入依赖 `gh workflow run` / API，UI 触发只适合单行内容。

## 替代方案

- CI 直推 bump commit 到 main：即 ADR 0003 已拒绝的方案，需要 ruleset bypass 或长期凭证，权限豁免长期存在。
- 合并后仍由维护者手动打 tag：保留两次本地操作，未消除本地依赖，且 tag 语义回到「维护者本地打」。
- tag 推送触发发布（`on: push: tags`）：GITHUB_TOKEN 推送的 tag 不会触发 workflow，必须引入额外凭证或二次手动触发；改为在同一 workflow 内以 job 依赖串联 tag 与发布。
- 引入 release-please 等第三方发版自动化：引入外部依赖与约定，其「从 Conventional Commits 自动推断版本」模型与本项目「人工决定版本号 + release note」的现状不匹配。
