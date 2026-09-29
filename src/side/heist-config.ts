// Every balance number for Level 3, in one place.

export const HEIST = {
  // ---- the take
  crateValue: 120,
  trunk: 8,
  carryMax: 2,
  cratesPerTruck: [2, 4] as const,
  damageCost: 40,
  fine: 500,
  // ---- the yard
  cutTime: 3,
  grabTime: 0.9,
  /** Officers within this many pixels of a cut or a grab hear it, whatever way they face. */
  noiseRadius: 150,
  patrols: 4,
  // ---- the car
  wreckAt: 4,
  maxSpeedOut: 360,
  maxSpeedBack: 380,
  accel: 220,
  brake: 420,
  drag: 70,
  laneTime: 0.35,
  hitCooldown: 1,
  // ---- the pursuit
  policeMax: 335,
  chaseBase: 0.3,
  chasePerCrate: 0.08,
  chasePerNoise: 0.05,
  chaseCap: 0.95,
  waves: [6, 20] as const,
  boxedAfter: 1.6,
  lostGap: 560,
  lostAfter: 3,
} as const;

export const payoutFor = (crates: number, damage: number): number => Math.max(0, crates * HEIST.crateValue - damage * HEIST.damageCost);
export const chaseChance = (crates: number, noiseEvents: number): number =>
  Math.min(HEIST.chaseCap, HEIST.chaseBase + HEIST.chasePerCrate * crates + HEIST.chasePerNoise * noiseEvents);
