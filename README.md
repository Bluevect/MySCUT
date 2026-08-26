<p align="center">
  <img src="public/icons/icon-192.png" width="112" height="112" alt="MySCUT 图标" />
</p>

<h1 align="center">MySCUT</h1>

<p align="center">
  <strong>你学习，我护航，我的华工我帮忙</strong>
</p>

<p align="center">
  一款面向华工学生的非官方课表与校园手册应用。<br />
  让课表留在自己的设备里，也让常用校园信息触手可及。
</p>

<p align="center">
  <a href="https://github.com/Kozmosa/MySCUT/releases/latest">下载</a> ·
  <a href="docs/">项目文档</a> ·
  <a href="https://go.scut.me">校园手册</a> ·
  <a href="CONTRIBUTING.md">参与开发</a>
</p>

<p align="center">
  <a href="https://github.com/Kozmosa/MySCUT/releases/latest"><img alt="Latest Release" src="https://img.shields.io/github/v/release/Kozmosa/MySCUT?style=flat-square&label=release" /></a>
  <a href="#平台支持"><img alt="Platforms" src="https://img.shields.io/badge/platforms-Web%20%7C%20Android%20%7C%20iOS%20%7C%20OHOS-1677ff?style=flat-square" /></a>
  <a href="https://github.com/Kozmosa/MySCUT/actions/workflows/ci.yml"><img alt="Quality Gates" src="https://github.com/Kozmosa/MySCUT/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/github/license/Kozmosa/MySCUT?style=flat-square" /></a>
</p>

---

## MySCUT 能做什么

| | |
| --- | --- |
| **教务课表导入** | 从教务系统导入课程，省去逐项录入的麻烦。 |
| **本地课表管理** | 在设备上保存、查看和调整自己的课表。 |
| **校园生存手册** | 在应用内浏览独立维护的华工校园手册。 |
| **Web 与多端支持** | 面向 Web、Android、iOS 和 OpenHarmony 提供一致的核心体验。 |

## 界面预览

<table>
  <thead>
    <tr>
      <th align="center">课表主页</th>
      <th align="center">课程详情</th>
      <th align="center">校园手册</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center"><sub>截图待补充</sub></td>
      <td align="center"><sub>截图待补充</sub></td>
      <td align="center"><sub>截图待补充</sub></td>
    </tr>
  </tbody>
</table>

## 下载

最新版本与安装包发布在 [GitHub Releases](https://github.com/Kozmosa/MySCUT/releases/latest)。

版本清单可从 [Cloudflare R2](https://pub-2d4ca40983644b4295125ec388670de9.r2.dev/kozmos/releases/versions.json) 获取。

## 平台支持

| 平台 | 说明 |
| --- | --- |
| Web / PWA | 可在浏览器中使用；部分教务导入能力受浏览器环境限制。 |
| Android | 主要发布平台，安装包见 GitHub Releases。 |
| iOS | 支持本地构建，需要 macOS、Xcode 与签名环境。 |
| OpenHarmony | 提供实验性适配与 Web 资源同步流程。 |

## 快速开始

需要 Node.js 22.13.0 或更高版本，推荐使用 Node 22 LTS。项目使用 npm，依赖版本由 `package-lock.json` 统一管理。

```bash
git clone --recurse-submodules https://github.com/Kozmosa/MySCUT.git
cd MySCUT
npm ci
npm run dev
```

常用验证命令：

```bash
npm run typecheck
npm test
npm run build:app
npm run check
```

<details>
  <summary>从 2026-07-17 前创建的 clone 更新</summary>

  公开 Git 历史曾于 2026-07-17 重写。请勿将旧历史 merge、rebase、cherry-pick 或 push 回仓库；应归档旧目录并重新克隆。详情见 [历史清理说明](docs/HISTORY_SANITIZATION.md)。
</details>

## 文档与手册

- [项目文档](docs/)
- [校园手册](https://go.scut.me)
- [隐私说明](PRIVACY.md)
- [贡献指南](CONTRIBUTING.md)
- [安全政策](SECURITY.md)

## 数据与隐私

课表、头像、显示偏好和可选服务配置默认保存在当前设备。应用只在你主动导入课表、检查更新或使用已配置的外部服务时发起相应请求，不包含遥测、行为分析或广告跟踪。完整说明见 [PRIVACY.md](PRIVACY.md)。

## 参与开发

欢迎修复问题、改进体验、补充测试或完善文档。开始之前，请先阅读 [贡献指南](CONTRIBUTING.md)；提交内容应使用合成测试数据，并保持个人信息与凭据远离 Git 历史。

## 许可证

MySCUT 的代码与主仓文档采用 [MIT License](LICENSE)。校园手册由独立上游维护，不属于本仓 MIT 许可范围，具体授权边界见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
