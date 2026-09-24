import { describe, expect, it } from 'vitest'
import { calculateCatchPoints, getDifficulty, ROUND_DURATION_SECONDS } from './difficulty'

describe('difficulty', () => {
  it('increases pressure across a round', () => {
    const early = getDifficulty(0)
    const late = getDifficulty(ROUND_DURATION_SECONDS)
    expect(late.spawnInterval).toBeLessThan(early.spawnInterval)
    expect(late.maximumActive).toBeGreaterThan(early.maximumActive)
    expect(late.holdDuration).toBeLessThan(early.holdDuration)
  })

  it('awards quick catch and streak bonuses', () => {
    const difficulty = getDifficulty(0)
    expect(calculateCatchPoints(0.1, difficulty, 1)).toBe(15)
    expect(calculateCatchPoints(0.1, difficulty, 3)).toBe(45)
    expect(calculateCatchPoints(1, difficulty, 1)).toBe(10)
  })
})
