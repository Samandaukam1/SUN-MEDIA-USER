import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useRouter } from 'expo-router';

import { HeaderButton } from '@/components/ui';

function CloseButton() {
  const router = useRouter();
  return <HeaderButton icon="x" label="Yopish" onPress={() => (router.canGoBack() ? router.back() : router.dismissAll())} />;
}

/** Form sheets: slide up and always offer an explicit close, not only the swipe-down gesture. */
export const modalOptions: NativeStackNavigationOptions = {
  presentation: 'modal',
  headerLeft: () => <CloseButton />,
};
