## 2026-08-24 应用内版本更新发布 SOP（App 端）
- 背景：打通「新装包后用户启动即见更新提醒 → 可选下载 → 系统引导安装」闭环，收敛为固定发布流程供每次发版复用
- `public/download/version.json` 是 App 端版本更新通道（App 内 `useAppUpdate.ts` 启动 24h 节流检测 + 手动入口均可拉取），须与同目录 APK 保持一致
- 发布 SOP：
  1. HBuilderX 云打包新版 APK（App 开发版 + DCloud 账号）
  2. 将 APK 复制到 `aistock-frontend/public/download/`，文件名含版本（如 `aistock-0.2.0.apk`），并同步更新 `version.json`：
     - `versionCode` 单调递增（必须 > 线上最新，如 100 → 101，否则用户永远看不到更新）
     - `versionName` → 新版本号
     - `downloadUrl` → 该 APK 文件名（`resolveDownloadUrl` 拼为 `${DOWNLOAD_BASE_URL}/{downloadUrl}` 直链）
     - `fileSize` → 实际大小（非「待发布」，弹窗会展示）
     - `description` → 本次更新要点（弹窗展示）
  3. 部署/重载 Web 静态资源，⚠️ 必须连 APK 一起部署到 dist/download/，否则 `/download/{downloadUrl}` 直链 404，扫码与 App 更新均失败
  4. 用户启动 App → 检测到 versionCode 更新 → 弹窗 → 可选下载 → `plus.runtime.install`；未开启「安装未知来源」时引导去系统设置开启

## 2026-08-18 Web 页脚 ICP 备案号更新
- `src/shared/components/TheFooter.vue`：备案号由「冀ICP备2025113956号」改为「粤ICP备2026026873号-2」（链接仍指向工信部 beian.miit.gov.cn）

## 2026-08-19 风口龙头板块「净流入」展示位改为「成交额」（同花顺实时，元）
- `src/modules/home/components/WindLeaderPanel.vue`：统计格「净流入/amount_trend/formatNetInflow」→「成交额/amount/formatAmount`（元→亿/万），去掉涨跌上色

## 2026-08-24 修复下载页扫码不下载（APK 直链）
- `src/modules/user/views/DownloadView.vue`：二维码与下载按钮由「下载页 URL」改为「APK 绝对直链 `${origin}/download/{downloadUrl}`」，手机扫码直接触发下载
- `public/download/version.json`：`fileSize` 由「待发布」改为「22.6 MB」
- `public/download/aistock-0.1.0.apk`：复制最新安装包（`__UNI__73E911F__20260821204646.apk`）至 Web 静态目录（git 忽略，不入库）
- ⚠️ 部署要点：上线时须把最新 APK 一并部署到 Web 静态目录（dist/download/），否则 `/download/aistock-0.1.0.apk` 仍 404
