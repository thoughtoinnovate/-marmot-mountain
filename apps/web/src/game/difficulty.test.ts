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

  it('adapts to player skill', () => {
    const casual = getDifficulty(30, 0.1)
    const expert = getDifficulty(30, 1)
    expect(expert.maximumActive).toBeGreaterThanOrEqual(casual.maximumActive)
    expect(expert.spawnInterval).toBeLessThan(casual.spawnInterval)
  })

  it('awards quick catch and streak bonuses', () => {
    const difficulty = getDifficulty(0)
    expect(calculateCatchPoints(0.1, difficulty, 1)).toBe(15)
    expect(calculateCatchPoints(0.1, difficulty, 3)).toBe(45)
    expect(calculateCatchPoints(1, difficulty, 1)).toBe(10)
  })
})
