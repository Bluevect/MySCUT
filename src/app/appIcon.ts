import { IS_NIGHTLY_CHANNEL } from '../services/update/channel'

export const APP_ICON_URL = IS_NIGHTLY_CHANNEL
  ? '/icons/icon-nightly-192.png'
  : '/icons/icon-192.png'
