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

退出确认只接受课程根页面连续两次未被其他处理器消费的返回操作。切换路由、关闭弹窗或由页面消费返回后，必须重新提示确认，不能沿用此前的退出提示。

同一页面的异步返回处理尚未结束时，重复返回不再次执行处理器；期间切换页面后，旧处理结果不能触发新页面的动画、导航或退出。详情页关闭动画进行中仍消费返回事件，由已经启动的动画完成一次父级导航。

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

- Android 的系统安全区由 Capacitor 8 `SystemBars` 注入的 `--safe-area-inset-*` 变量提供；页面通过 `--safe-top-inset`、`--safe-bottom-inset` 消费，Web/iOS 回退到对应的 `env(safe-area-inset-*)`。不要恢复已不生效的 `adjustMarginsForEdgeToEdge` 配置，也不要只读取 Android WebView 中可能为零的 `env()`。
- 手册容器保持块级布局，按底部导航高度预留空间；隐藏标签页时只隐藏容器，不卸载 iframe 或把其 display 改为 inline/unset。
- 底部标签在有效单指轻触结束时激活一次链接，并阻止后续兼容 click，避免 Android WebView 在课表滑动后漏发 click；拖动超过阈值、多指、取消或落点离开标签时不主动激活链接。鼠标和键盘仍使用标准链接行为。
- 新增或修改页面路由时，必须同时更新 `src/app/routePaths.ts`、`src/app/routes.tsx`、`src/core/navigation/appBack.ts`。
- 新增路由必须在 `APP_ROUTE_PATHS` 注册，并在 `PARENT_ROUTE_MAP` 中配置父页面；根页面和 `*` 除外。
- `tests/core/navigation/appBack.test.ts` 会检查所有注册页面路由都有返回目标，且返回目标仍是已知页面路由。
- Android 的 `/manual` 通过 `WebViewHistory` 读取 WebView 联合会话历史的当前位置，适用于本地及跨域手册。不能用 `history.length` 代替位置：返回后重新进入文章会覆盖前进分支，总条数可能不变。
- 切换 tab 时 iframe 保持挂载，应用产生的历史位置会单独标记；再次进入 `/manual` 后返回，会先跳过当前文章之后的 tab 历史。原生回退完成前合并重复返回；过期的历史位置不能触发新的回退或让应用直接跳到课程页。
- 非 Android 平台仍使用历史长度启发式回退；跨域 iframe 自身历史不可读，该路径不等同于 Android 的原生位置验证。

相关实现：

- `src/core/navigation/appBack.ts`
- `src/core/navigation/backDismiss.ts`
- `src/platform/capacitor/useHardwareBackButton.ts`
- `src/platform/capacitor/useBackDismiss.ts`
- `src/platform/web/iframeHistory.ts`
- `src/platform/capacitor/manualHistory.ts`
- `android/app/src/main/java/com/manual/univ/WebViewHistoryPlugin.java`
