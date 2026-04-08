import { useState } from 'react';
import { Alert } from 'react-native';
import { Stack, Text, Paragraph } from 'tamagui';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useAuth } from '../context/AuthContext';

interface Props {
  content: string;
  onReveal?: () => void;
}

export function GreyLayer({ content, onReveal }: Props) {
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const opacity = useSharedValue(0.3);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  function handleTap() {
    if (!user) {
      Alert.alert(
        'ログインが必要です',
        'この投稿を確認するにはログインしてください',
        [{ text: 'OK' }],
      );
      return;
    }

    opacity.value = withTiming(1.0, { duration: 300 });
    setRevealed(true);
    onReveal?.();
  }

  if (revealed) {
    return <Paragraph>{content}</Paragraph>;
  }

  return (
    <Stack
      onPress={handleTap}
      accessible
      accessibilityRole="button"
      accessibilityLabel="タップして内容を確認する"
    >
      <Animated.View style={animatedStyle}>
        <BlurView intensity={20} tint="light">
          <Paragraph opacity={0.3} padding="$2">
            {content}
          </Paragraph>
        </BlurView>
      </Animated.View>
      <Text
        position="absolute"
        alignSelf="center"
        top="35%"
        color="$gray10"
        fontSize="$3"
      >
        タップして内容を確認する
      </Text>
    </Stack>
  );
}
