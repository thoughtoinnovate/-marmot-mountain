import { describe, expect, it } from 'vitest'
import { chooseVoice } from './StoryVoice'
import { STORY_CHAPTERS, TOTAL_STORY_TASKS, getStoryTask } from './storyData'

describe('story data', () => {
  it('contains five chapters and fifteen guided tasks', () => {
    expect(STORY_CHAPTERS).toHaveLength(5)
    expect(TOTAL_STORY_TASKS).toBe(15)
    expect(getStoryTask(0, 0)?.id).toBe('hello-flower')
    expect(getStoryTask(4, 2)?.id).toBe('parade-marmot')
  })

  it('keeps every task valid and uniquely identified', () => {
    const taskIds = new Set<string>()
    for (const chapter of STORY_CHAPTERS) {
      for (const task of chapter.tasks) {
        expect(taskIds.has(task.id)).toBe(false)
        taskIds.add(task.id)
        expect(task.choices).toHaveLength(3)
        expect(task.choices.some(choice => choice.id === task.correctId)).toBe(true)
        expect(new Set(task.choices.map(choice => choice.position.x)).size).toBe(3)
      }
    }
  })
})

describe('story voice selection', () => {
  it('prefers an English voice for a character role', () => {
    const voices = [
      { lang: 'fr-FR', name: 'Amelie' },
      { lang: 'en-US', name: 'Samantha' },
    ] as SpeechSynthesisVoice[]
    expect(chooseVoice(voices, 'marmot')?.name).toBe('Samantha')
  })
})
