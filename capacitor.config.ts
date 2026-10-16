import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.manual.univ',
  appName: '启梦华工',
  webDir: process.env.CAP_WEB_DIR || 'dist/android',
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
    },
  },
  backgroundColor: '#00000000',
}

export default config
