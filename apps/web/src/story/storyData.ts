export type StoryVoiceRole = 'narrator' | 'marmot' | 'squirrel' | 'bird'
export type StoryItemKind =
  | 'flower'
  | 'acorn'
  | 'rock'
  | 'star'
  | 'leaf'
  | 'berry'
  | 'marmot'
  | 'squirrel'
  | 'nest'
  | 'bird'
  | 'coat'
  | 'carrot'
  | 'snowflake'
  | 'balloon'

export interface StoryChoice {
  id: string
  label: string
  kind: StoryItemKind
  tint: readonly [number, number, number]
  position: { x: number; z: number }
}

export interface StoryTask {
  id: string
  prompt: string
  hint: string
  voice: string
  voiceRole: StoryVoiceRole
  correctId: string
  choices: readonly [StoryChoice, StoryChoice, StoryChoice]
}

export interface StoryChapter {
  id: string
  title: string
  intro: string
  tasks: readonly [StoryTask, StoryTask, StoryTask]
}

const choice = (
  id: string,
  label: string,
  kind: StoryItemKind,
  tint: readonly [number, number, number],
  slot: number,
): StoryChoice => ({
  id,
  label,
  kind,
  tint,
  position: { x: [-2.8, 0, 2.8][slot] ?? 0, z: slot === 1 ? -0.4 : 0.35 },
})

const task = (
  id: string,
  prompt: string,
  hint: string,
  correct: StoryChoice,
  distractors: readonly [StoryChoice, StoryChoice],
  voiceRole: StoryVoiceRole = 'narrator',
): StoryTask => ({
  id,
  prompt,
  hint,
  voice: prompt,
  voiceRole,
  correctId: correct.id,
  choices: [correct, distractors[0], distractors[1]].map((item, index) => ({
    ...item,
    position: { x: [-2.8, 0, 2.8][index] ?? 0, z: index === 1 ? -0.4 : 0.35 },
  })) as [StoryChoice, StoryChoice, StoryChoice],
})

const flower = (id: string): StoryChoice => choice(id, 'flower', 'flower', [1, 0.45, 0.18], 0)
const acorn = (id: string): StoryChoice => choice(id, 'acorn', 'acorn', [0.65, 0.35, 0.12], 0)
const rock = (id: string): StoryChoice => choice(id, 'rock', 'rock', [0.48, 0.52, 0.5], 0)
const star = (id: string): StoryChoice => choice(id, 'star', 'star', [1, 0.8, 0.22], 0)
const leaf = (id: string): StoryChoice => choice(id, 'leaf', 'leaf', [0.25, 0.65, 0.25], 0)
const berry = (id: string): StoryChoice => choice(id, 'berry', 'berry', [0.86, 0.2, 0.28], 0)
const marmot = (id: string): StoryChoice => choice(id, 'marmot', 'marmot', [0.55, 0.3, 0.14], 0)
const squirrel = (id: string): StoryChoice => choice(id, 'squirrel', 'squirrel', [0.64, 0.34, 0.15], 0)
const nest = (id: string): StoryChoice => choice(id, 'nest', 'nest', [0.48, 0.28, 0.1], 0)
const bird = (id: string): StoryChoice => choice(id, 'bird', 'bird', [0.2, 0.58, 0.88], 0)
const coat = (id: string): StoryChoice => choice(id, 'coat', 'coat', [0.8, 0.3, 0.25], 0)
const carrot = (id: string): StoryChoice => choice(id, 'carrot', 'carrot', [0.95, 0.38, 0.12], 0)
const snowflake = (id: string): StoryChoice => choice(id, 'snowflake', 'snowflake', [0.9, 0.96, 1], 0)
const balloon = (id: string): StoryChoice => choice(id, 'balloon', 'balloon', [0.95, 0.35, 0.55], 0)

export const STORY_CHAPTERS: readonly StoryChapter[] = [
  {
    id: 'hello',
    title: 'A Friendly Hello',
    intro: 'Welcome to the sunny meadow. Our marmot friends are waiting to play!',
    tasks: [
      task('hello-flower', 'Can you help me find a flower?', 'Look for the bright flower in the meadow.', flower('hello-flower-correct'), [rock('hello-flower-rock'), star('hello-flower-star')] as const, 'marmot'),
      task('hello-star', 'Let us find a star for the sky.', 'The star is warm and bright.', star('hello-star-correct'), [leaf('hello-star-leaf'), berry('hello-star-berry')] as const),
      task('hello-marmot', 'Say hello to the marmot.', 'Tap the furry brown friend.', marmot('hello-marmot-correct'), [bird('hello-marmot-bird'), flower('hello-marmot-flower')] as const, 'marmot'),
    ],
  },
  {
    id: 'acorn',
    title: 'The Lost Acorn',
    intro: 'A little squirrel has lost something tasty. Can you help?',
    tasks: [
      task('lost-acorn', 'Can you find the acorn?', 'Look for the little brown acorn.', acorn('lost-acorn-correct'), [berry('lost-acorn-berry'), leaf('lost-acorn-leaf')] as const, 'squirrel'),
      task('find-leaf', 'The squirrel needs a leaf too.', 'Find the green leaf.', leaf('find-leaf-correct'), [rock('find-leaf-rock'), flower('find-leaf-flower')] as const),
      task('hello-squirrel', 'Say hello to the squirrel.', 'Tap the squirrel with the big tail.', squirrel('hello-squirrel-correct'), [bird('hello-squirrel-bird'), marmot('hello-squirrel-marmot')] as const, 'squirrel'),
    ],
  },
  {
    id: 'nest',
    title: 'A Bird Needs a Nest',
    intro: 'A bird is building a cozy home. Let us help gather soft things.',
    tasks: [
      task('find-nest', 'Where is the cozy nest?', 'Look for the round brown nest.', nest('find-nest-correct'), [balloon('find-nest-balloon'), rock('find-nest-rock')] as const, 'bird'),
      task('find-bird', 'Can you find the little bird?', 'Look for the blue bird.', bird('find-bird-correct'), [marmot('find-bird-marmot'), acorn('find-bird-acorn')] as const, 'bird'),
      task('nest-leaf', 'The nest needs one soft leaf.', 'Find the green leaf for the nest.', leaf('nest-leaf-correct'), [flower('nest-leaf-flower'), star('nest-leaf-star')] as const),
    ],
  },
  {
    id: 'snow',
    title: 'Snowy Day',
    intro: 'Snow is falling on the mountain. Let us get everyone warm and cozy.',
    tasks: [
      task('find-coat', 'Can you find the warm coat?', 'Look for the soft red coat.', coat('find-coat-correct'), [snowflake('find-coat-snowflake'), flower('find-coat-flower')] as const),
      task('find-carrot', 'The marmot would like a carrot.', 'Find the orange carrot.', carrot('find-carrot-correct'), [star('find-carrot-star'), rock('find-carrot-rock')] as const, 'marmot'),
      task('find-snowflake', 'Catch the gentle snowflake.', 'Find the white snowflake.', snowflake('find-snowflake-correct'), [flower('find-snowflake-flower'), berry('find-snowflake-berry')] as const),
    ],
  },
  {
    id: 'parade',
    title: 'Meadow Parade',
    intro: 'Our meadow friends are ready for a gentle parade!',
    tasks: [
      task('parade-flower', 'Find a flower for the parade.', 'Choose the bright meadow flower.', flower('parade-flower-correct'), [berry('parade-flower-berry'), rock('parade-flower-rock')] as const),
      task('parade-balloon', 'Find the pink balloon.', 'Look for the round pink balloon.', balloon('parade-balloon-correct'), [nest('parade-balloon-nest'), leaf('parade-balloon-leaf')] as const),
      task('parade-marmot', 'Who is ready to march?', 'Tap the furry brown marmot.', marmot('parade-marmot-correct'), [bird('parade-marmot-bird'), squirrel('parade-marmot-squirrel')] as const, 'marmot'),
    ],
  },
]

export const TOTAL_STORY_TASKS = STORY_CHAPTERS.reduce((sum, chapter) => sum + chapter.tasks.length, 0)

export function getStoryTask(chapterIndex: number, taskIndex: number): StoryTask | null {
  return STORY_CHAPTERS[chapterIndex]?.tasks[taskIndex] ?? null
}

export function getStoryChoice(taskData: StoryTask, choiceId: string): StoryChoice | null {
  return taskData.choices.find(choiceData => choiceData.id === choiceId) ?? null
}
