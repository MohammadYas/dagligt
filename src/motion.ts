import { WithSpringConfig, WithTimingConfig, Easing } from 'react-native-reanimated';

/**
 * Ét bevaegelsessprog for hele appen, oversat fra iOS' egne fjedre.
 * SwiftUI beskriver dem som respons + daempning; Reanimated vil have
 * stivhed + daempning, saa vaerdierne her er de samme kurver i den anden
 * notation. Alt i appen bruger disse tre — ikke egne tal per sted.
 */

/** .snappy — kvitterer paa et tryk. Kort vej, ingen efterslag. */
export const snappy: WithSpringConfig = { damping: 26, stiffness: 420, mass: 0.7 };

/** .smooth — flytter noget fra ét sted til et andet uden at hoppe. */
export const smooth: WithSpringConfig = { damping: 30, stiffness: 240, mass: 0.9 };

/** .bouncy — kun hvor et lille efterslag betyder "det virkede". */
export const bouncy: WithSpringConfig = { damping: 14, stiffness: 320, mass: 0.7 };

/** Selvsikker ankomst uden fjeder. Bruges naar Reduce Motion er slaaet fra. */
export const ankomst: WithTimingConfig = {
  duration: 280,
  easing: Easing.bezier(0.16, 1, 0.3, 1),
};

/** Udgang gaar hurtigere end indgang, ellers foeles den som ventetid. */
export const udgang: WithTimingConfig = { duration: 170, easing: Easing.out(Easing.quad) };

/** Reduce Motion: samme tilstandsskift, uden at noget flytter sig. */
export const daempetSkift: WithTimingConfig = { duration: 120, easing: Easing.out(Easing.quad) };
