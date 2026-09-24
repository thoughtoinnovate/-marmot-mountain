import { describe, expect, it } from 'vitest'
import {
  chooseHoleIndex,
  getSkillProfile,
  getSpawnDelay,
  rememberHole,
} from './spawnDirector'

describe('spawn director', () => {
  it('avoids recently active holes when alternatives exist', () => {
    const memory = rememberHole(
      { recentHoleIndices: [2, 1], lastHoleIndex: 2 },
      2,
    )
    const selected = chooseHoleIndex([0, 1, 2, 3, 4], memory, () => 0.99)
    expect(selected).not.toBe(2)
    expect(selected).not.toBe(1)
  })

  it('falls back to the only available hole', () => {
    expect(chooseHoleIndex([3], { recentHoleIndices: [], lastHoleIndex: 0 }, () => 0)).toBe(3)
    expect(chooseHoleIndex([], { recentHoleIndices: [], lastHoleIndex: 0 })).toBeNull()
  })

  it('raises pressure for accurate streaks', () => {
    const struggling = getSkillProfile(1, 9, 0)
    const thriving = getSkillProfile(20, 1, 5)
    expect(thriving.pressure).toBeGreaterThan(struggling.pressure)
    const normalDelay = getSpawnDelay(1, struggling, () => 0.5)
    const skilledDelay = getSpawnDelay(1, thriving, () => 0.5)
    expect(skilledDelay).toBeLessThan(normalDelay)
  })
})
