export const ROUND_DURATION_SECONDS = 60

export interface Difficulty {
  spawnInterval: number
  maximumActive: number
  riseDuration: number
  holdDuration: number
  fallDuration: number
  quickCatchSeconds: number
}

export function getDifficulty(elapsedSeconds: number): Difficulty {
  const progress = Math.max(0, Math.min(1, elapsedSeconds / ROUND_DURATION_SECONDS))
  return {
    spawnInterval: 0.88 - progress * 0.54,
    maximumActive: 1 + Math.floor(progress * 3.8),
    riseDuration: 0.58 - progress * 0.22,
    holdDuration: 0.78 - progress * 0.38,
    fallDuration: 0.42 - progress * 0.12,
    quickCatchSeconds: 0.55 - progress * 0.18,
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
