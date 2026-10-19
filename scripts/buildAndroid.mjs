import { rootDir, run } from './manualSubmoduleUtils.mjs'

const isNightly = process.argv.includes('--nightly')

run('node scripts/buildApp.mjs', rootDir, {
  VITE_OUT_DIR: 'dist/android',
  VITE_TARGET_PLATFORM: 'android',
  ...(isNightly ? { VITE_UPDATE_CHANNEL: 'nightly' } : {}),
})
run('node scripts/syncNativeVersion.mjs', rootDir)
run('npx cap sync android', rootDir, {
  CAP_WEB_DIR: 'dist/android',
})
