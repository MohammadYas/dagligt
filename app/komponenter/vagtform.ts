import { calculateShiftGross, PaySettings, Shift, ShiftCalculation } from '../../src/lon';

const DATO = /^\d{4}-\d{2}-\d{2}$/;
const TID = /^\d{2}:\d{2}$/;
const TOM: ShiftCalculation = { gross: 0, totalMinutes: 0, paidMinutes: 0, segments: [] };

/** Shift preview for the sheet. A cleared date/time field gives an invalid shift instead of throwing during render. */
export function beregnVagt(vagt: Shift, settings: PaySettings): { gyldig: boolean; beregning: ShiftCalculation } {
  if (!DATO.test(vagt.date) || !TID.test(vagt.start) || !TID.test(vagt.end)) return { gyldig: false, beregning: TOM };
  const beregning = calculateShiftGross(vagt, settings);
  return { gyldig: beregning.totalMinutes > 0, beregning };
}
