import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.marmotmountain.game',
  appName: 'Marmot Mountain',
  webDir: 'apps/web/dist',
  backgroundColor: '#9ed9f2',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'always',
  },
}

export default config
