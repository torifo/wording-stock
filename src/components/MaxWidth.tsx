import { YStack } from 'tamagui';
import type { ReactNode } from 'react';

/** PC 表示でコンテンツ幅を中央寄せに制限する。モバイルでは full-width のまま。 */
export function MaxWidth({ children }: { children: ReactNode }) {
  return (
    <YStack flex={1} alignItems="center" width="100%">
      <YStack flex={1} width="100%" maxWidth={700}>
        {children}
      </YStack>
    </YStack>
  );
}
