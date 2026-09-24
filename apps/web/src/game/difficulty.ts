export const ROUND_DURATION_SECONDS = 60

export interface Difficulty {
  spawnInterval: number
  maximumActive: number
  riseDuration: number
  holdDuration: number
  fallDuration: number
  quickCatchSeconds: number
}

export function getDifficulty(elapsedSeconds: number, skillPressure = 0.5): Difficulty {
  const progress = Math.max(0, Math.min(1, elapsedSeconds / ROUND_DURATION_SECONDS))
  const challenge = Math.max(0, Math.min(1, progress * 0.72 + skillPressure * 0.28))
  return {
    spawnInterval: 0.9 - challenge * 0.62,
    maximumActive: 1 + Math.floor(challenge * 4.8),
    riseDuration: 0.62 - challenge * 0.3,
    holdDuration: 0.84 - challenge * 0.46,
    fallDuration: 0.46 - challenge * 0.16,
    quickCatchSeconds: 0.58 - challenge * 0.2,
  }
}

export function calculateCatchPoints(
  reactionSeconds: number,
  difficulty: Difficulty,
  combo: number,
): number {
  const reactionBonus = reactionSeconds <= difficulty.quickCatchSeconds ? 5 : 0
  const comboMultiplier = Math.min(5, Math.max(1, combo))
  return (10 + reactionBonus) * comboMultiplier
}
