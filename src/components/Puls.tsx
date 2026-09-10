import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

type Props = {
  farve: string;
  /** Taeller op hver gang en ny opdatering er landet. */
  slag: number;
  /** Reduceret bevaegelse: vis prikken, drop ringen. */
  daempet: boolean;
};

/**
 * Statusprikken med en ring der slaar ét slag pr. modtaget opdatering.
 * Scripterne melder ind hvert minut; ringen er den melding, gjort synlig.
 */
export default function Puls({ farve, slag, daempet }: Props) {
  const skala = useSharedValue(0.6);
  const klarhed = useSharedValue(0);
  const kerne = useSharedValue(1);

  useEffect(() => {
    if (daempet || slag === 0) return;

    kerne.value = withSequence(
      withTiming(1.35, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 260, easing: Easing.bezier(0.16, 1, 0.3, 1) }),
    );

    skala.value = 0.6;
    klarhed.value = 0.55;
    skala.value = withTiming(2.4, { duration: 900, easing: Easing.bezier(0.16, 1, 0.3, 1) });
    klarhed.value = withDelay(120, withTiming(0, { duration: 780, easing: Easing.out(Easing.quad) }));
  }, [slag, daempet]);

  const ringStil = useAnimatedStyle(() => ({
    transform: [{ scale: skala.value }],
    opacity: klarhed.value,
  }));

  const kerneStil = useAnimatedStyle(() => ({
    transform: [{ scale: kerne.value }],
  }));

  return (
    <View style={s.rum}>
      <Animated.View style={[s.ring, { borderColor: farve }, ringStil]} pointerEvents="none" />
      <Animated.View style={[s.prik, { backgroundColor: farve }, kerneStil]} />
    </View>
  );
}

const s = StyleSheet.create({
  rum: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 1.5 },
  prik: { width: 9, height: 9, borderRadius: 4.5 },
});
