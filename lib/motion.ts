import { Platform } from 'react-native';

/** The native animated driver does not exist on web; Animated falls back to JS there anyway. */
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
