# 原生返回导航

本文记录应用原生返回键的固定行为。返回键不依赖浏览器历史。页面路由由 `src/app/routePaths.ts` 中的 `APP_ROUTE_PATHS` 注册，`src/app/routes.tsx` 使用该常量构建路由；返回层级由 `src/core/navigation/appBack.ts` 中的 `PARENT_ROUTE_MAP` 定义，测试负责保证两者同步。

## 固定优先级

每次按下返回键，按以下顺序处理，前一步处理成功后立即结束：

1. 关闭最上层弹窗。
2. 交给当前页面的返回处理器。
3. 交给页面动画返回处理器。
4. 按路由层级返回父页面。
5. 在 `/courses` 根页面提示二次确认退出。

弹窗通过 LIFO 注册栈管理，多个弹窗同时打开时只关闭最上层。页面关闭按钮与原生返回共用 `resolveBackPath(pathname)`，不再调用 `navigate(-1)` 或浏览器历史 API。

## 路由层级

| 当前路由 | 返回目标 |
| --- | --- |
| `/courses` | 根页面，首次返回提示，3 秒内再次返回退出 |
| `/courses/intersection-preview` | `/mine/schedule-intersection` |
| `/manual` | iframe 内部历史；没有可回退历史时返回 `/courses` |
| `/mine` | `/courses` |
| `/mine/schedule-settings` | `/mine` |
| `/mine/schedule-intersection` | `/mine` |
| `/mine/ai-settings` | `/mine` |
| `/mine/import-scut-pdf` | `/mine/schedule-settings` |
| `/mine/import-scut-jw` | `/mine/schedule-settings` |
| `/mine/import-scut-jw-webview` | `/mine/schedule-settings` |
| `/mine/global-settings` | `/mine` |
| `/mine/faq` | `/mine` |
| `/mine/more` | `/mine` |

`/` 只重定向到 `/courses`，`*` 只渲染未找到页面，二者不参与返回层级。

## 维护要求

- 新增或修改页面路由时，必须同时更新 `src/app/routePaths.ts`、`src/app/routes.tsx`、`src/core/navigation/appBack.ts`。
- 新增路由必须在 `APP_ROUTE_PATHS` 注册，并在 `PARENT_ROUTE_MAP` 中配置父页面；根页面和 `*` 除外。
- `tests/core/navigation/appBack.test.ts` 会检查所有注册页面路由都有返回目标，且返回目标仍是已知页面路由。
- `/manual` 依赖 app 与 iframe 共享 session history 的长度增量判断跨域 iframe 是否仍有内部历史。跨域 iframe 自身历史不可读，长度增量只能作为启发式判断。
- 切换 tab 时 iframe 保持挂载，应用产生的历史条目会单独计数；再次进入 `/manual` 后返回，会先跳过这些 tab 历史并继续回退 iframe 内部页面。

相关实现：

- `src/core/navigation/appBack.ts`
- `src/core/navigation/backDismiss.ts`
- `src/platform/capacitor/useHardwareBackButton.ts`
- `src/platform/capacitor/useBackDismiss.ts`
- `src/platform/web/iframeHistory.ts`
