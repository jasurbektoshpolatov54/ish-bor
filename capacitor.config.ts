import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'uz.ishbor.app',
  appName: 'Ish bor',
  webDir: 'dist',
  backgroundColor: '#0b0b0e',
  android: { allowMixedContent: false },
  plugins: {
    LocalNotifications: { smallIcon: 'ic_stat_ishbor', iconColor: '#E6C07A' },
  },
};

export default config;
