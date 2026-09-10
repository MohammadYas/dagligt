import { View, Text, StyleSheet, TextStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

type Props = {
  vaerdi: string | number;
  stil: TextStyle | TextStyle[];
  daempet: boolean;
};

/**
 * Tallet ruller op naar en ny maaling lander. Scripterne melder ind hvert
 * minut, og bevaegelsen er den melding: staar tallet stille, er der intet nyt.
 */
export default function RulleTal({ vaerdi, stil, daempet }: Props) {
  const tekst = String(vaerdi);

  if (daempet) {
    return <Text style={stil}>{tekst}</Text>;
  }

  return (
    <View style={s.rude}>
      <Animated.Text
        key={tekst}
        entering={FadeInDown.duration(300).springify().damping(18)}
        exiting={FadeOutUp.duration(180)}
        style={stil}
      >
        {tekst}
      </Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Fast hoejde saa ind- og udgaaende tal ikke skubber layoutet.
  rude: { height: 26, overflow: 'hidden', justifyContent: 'flex-start' },
});
