export interface SpawnMemory {
  recentHoleIndices: number[]
  lastHoleIndex: number | null
}

export interface SkillProfile {
  accuracy: number
  pressure: number
}

export function chooseHoleIndex(
  availableHoleIndices: readonly number[],
  memory: SpawnMemory,
  random: () => number = Math.random,
): number | null {
  if (availableHoleIndices.length === 0) {
    return null
  }
  if (availableHoleIndices.length === 1) {
    return availableHoleIndices[0] ?? null
  }
  const recentCounts = new Map<number, number>()
  for (const index of memory.recentHoleIndices) {
    recentCounts.set(index, (recentCounts.get(index) ?? 0) + 1)
  }
  const weights = availableHoleIndices.map((index) => {
    const recentPenalty = 1 / (1 + (recentCounts.get(index) ?? 0) * 2.4)
    const repeatPenalty = memory.lastHoleIndex === index ? 0.22 : 1
    return recentPenalty * repeatPenalty
  })
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  let cursor = random() * totalWeight
  for (let index = 0; index < availableHoleIndices.length; index += 1) {
    cursor -= weights[index] ?? 0
    if (cursor <= 0) {
      return availableHoleIndices[index] ?? null
    }
  }
  return availableHoleIndices[availableHoleIndices.length - 1] ?? null
}

export function rememberHole(memory: SpawnMemory, holeIndex: number, historySize = 4): SpawnMemory {
  return {
    recentHoleIndices: [holeIndex, ...memory.recentHoleIndices.filter(index => index !== holeIndex)].slice(0, historySize),
    lastHoleIndex: holeIndex,
  }
}

export function getSkillProfile(catches: number, misses: number, combo: number): SkillProfile {
  const attempts = Math.max(1, catches + misses)
  const accuracy = Math.max(0, Math.min(1, catches / attempts))
  const momentum = Math.min(1, combo / 6)
  return {
    accuracy,
    pressure: Math.min(1, accuracy * 0.72 + momentum * 0.28),
  }
}

export function getSpawnDelay(baseDelay: number, skill: SkillProfile, random: () => number = Math.random): number {
  const skillFactor = 1.08 - skill.pressure * 0.2
  return baseDelay * skillFactor * (0.84 + random() * 0.32)
}
