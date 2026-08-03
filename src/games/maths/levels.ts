export type MathsTopic =
  | 'addition'
  | 'before'
  | 'after'
  | 'between'
  | 'subtraction'
  | 'ascending'
  | 'descending';

export interface MathsLevel {
  id: number;
  topic: MathsTopic;
  title: string;
  prompt: string;
  questionCount: number;
  passMark: number;
  min: number;
  max: number;
  numberCount?: number;
}

export interface MathsQuestion {
  prompt: string;
  answer: string;
  choices: string[];
  hint: string;
}

const TOPIC_LABELS: Record<MathsTopic, string> = {
  addition: 'Adding Fun',
  before: 'Before Number',
  after: 'After Number',
  between: 'Middle Number',
  subtraction: 'Take Away',
  ascending: 'Small to Big',
  descending: 'Big to Small',
};

function buildLevels(): MathsLevel[] {
  let id = 1;
  const levels: MathsLevel[] = [];
  const push = (
    topic: MathsTopic,
    count: number,
    builder: (step: number, levelId: number) => Omit<MathsLevel, 'id' | 'topic'>
  ) => {
    for (let step = 0; step < count; step += 1) {
      levels.push({ id, topic, ...builder(step, id) });
      id += 1;
    }
  };

  push('addition', 5, (step) => ({
    title: `${TOPIC_LABELS.addition} ${step + 1}`,
    prompt: 'Add the numbers together.',
    questionCount: 5,
    passMark: 3,
    min: step,
    max: 5 + step * 2,
  }));
  push('before', 4, (step) => ({
    title: `${TOPIC_LABELS.before} ${step + 1}`,
    prompt: 'Find the number just before.',
    questionCount: 5,
    passMark: 3,
    min: 1 + step * 4,
    max: 10 + step * 6,
  }));
  push('after', 4, (step) => ({
    title: `${TOPIC_LABELS.after} ${step + 1}`,
    prompt: 'Find the number just after.',
    questionCount: 5,
    passMark: 3,
    min: step * 4,
    max: 9 + step * 6,
  }));
  push('between', 4, (step) => ({
    title: `${TOPIC_LABELS.between} ${step + 1}`,
    prompt: 'Pick the number in the middle.',
    questionCount: 5,
    passMark: 3,
    min: step * 3,
    max: 10 + step * 6,
  }));
  push('subtraction', 4, (step) => ({
    title: `${TOPIC_LABELS.subtraction} ${step + 1}`,
    prompt: 'Take away the smaller number.',
    questionCount: 5,
    passMark: 3 + (step >= 2 ? 1 : 0),
    min: step,
    max: 8 + step * 4,
  }));
  push('ascending', 5, (step) => ({
    title: `${TOPIC_LABELS.ascending} ${step + 1}`,
    prompt: 'Put the numbers from small to big.',
    questionCount: 5,
    passMark: 4,
    min: step,
    max: 12 + step * 7,
    numberCount: Math.min(5, 3 + Math.floor((step + 1) / 2)),
  }));
  push('descending', 4, (step) => ({
    title: `${TOPIC_LABELS.descending} ${step + 1}`,
    prompt: 'Put the numbers from big to small.',
    questionCount: 5,
    passMark: 4,
    min: step * 2,
    max: 18 + step * 9,
    numberCount: Math.min(5, 3 + Math.ceil((step + 1) / 2)),
  }));

  return levels;
}

export const MATHS_LEVELS = buildLevels();

export function getMathsLevel(levelId: number): MathsLevel {
  return MATHS_LEVELS.find((level) => level.id === levelId) ?? MATHS_LEVELS[0];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function makeNumberChoices(answer: number, min: number, max: number): string[] {
  const choices = new Set<number>([answer]);
  const deltas = shuffle([-3, -2, -1, 1, 2, 3, 4]);
  for (const delta of deltas) {
    choices.add(clampRange(answer + delta, min, max));
    if (choices.size === 4) break;
  }
  while (choices.size < 4) {
    choices.add(randomInt(min, max));
  }
  return shuffle(Array.from(choices).map(String));
}

function uniqueNumbers(count: number, min: number, max: number): number[] {
  const numbers = new Set<number>();
  while (numbers.size < count) {
    numbers.add(randomInt(min, max));
  }
  return Array.from(numbers);
}

function formatLine(numbers: number[]): string {
  return numbers.join('  •  ');
}

function buildOrderChoices(
  numbers: number[],
  direction: 'ascending' | 'descending'
): string[] {
  const correct =
    direction === 'ascending'
      ? [...numbers].sort((a, b) => a - b)
      : [...numbers].sort((a, b) => b - a);
  const choices = new Set<string>([formatLine(correct)]);
  const variants = [
    [...numbers],
    [...correct].reverse(),
    shuffle(numbers),
    [...correct].map((value, index, source) =>
      index % 2 === 0 ? value : source[source.length - index]
    ),
  ];
  for (const variant of variants) {
    choices.add(formatLine(variant));
    if (choices.size === 4) break;
  }
  while (choices.size < 4) {
    choices.add(formatLine(shuffle(numbers)));
  }
  return shuffle(Array.from(choices));
}

function createQuestion(level: MathsLevel): MathsQuestion {
  switch (level.topic) {
    case 'addition': {
      const first = randomInt(level.min, level.max);
      const second = randomInt(level.min, level.max);
      const answer = first + second;
      return {
        prompt: `${first} + ${second} = ?`,
        answer: String(answer),
        choices: makeNumberChoices(answer, 0, level.max * 2 + 4),
        hint: 'Count on with your fingers if you need to.',
      };
    }
    case 'before': {
      const value = randomInt(level.min + 1, level.max);
      const answer = value - 1;
      return {
        prompt: `What comes before ${value}?`,
        answer: String(answer),
        choices: makeNumberChoices(answer, Math.max(0, level.min - 1), level.max),
        hint: 'Say the numbers backwards one step.',
      };
    }
    case 'after': {
      const value = randomInt(level.min, level.max - 1);
      const answer = value + 1;
      return {
        prompt: `What comes after ${value}?`,
        answer: String(answer),
        choices: makeNumberChoices(answer, level.min, level.max + 1),
        hint: 'Say the next number out loud.',
      };
    }
    case 'between': {
      const start = randomInt(level.min, level.max - 2);
      const answer = start + 1;
      return {
        prompt: `What comes between ${start} and ${start + 2}?`,
        answer: String(answer),
        choices: makeNumberChoices(answer, level.min, level.max),
        hint: 'Point to the middle spot.',
      };
    }
    case 'subtraction': {
      const first = randomInt(level.min + 2, level.max);
      const second = randomInt(level.min, first - 1);
      const answer = first - second;
      return {
        prompt: `${first} - ${second} = ?`,
        answer: String(answer),
        choices: makeNumberChoices(answer, 0, level.max),
        hint: 'Start with the big number and hop back.',
      };
    }
    case 'ascending': {
      const numbers = uniqueNumbers(level.numberCount ?? 3, level.min, level.max);
      return {
        prompt: `Put these in order: ${formatLine(numbers)}`,
        answer: formatLine([...numbers].sort((a, b) => a - b)),
        choices: buildOrderChoices(numbers, 'ascending'),
        hint: 'Look for the smallest number first.',
      };
    }
    case 'descending': {
      const numbers = uniqueNumbers(level.numberCount ?? 3, level.min, level.max);
      return {
        prompt: `Put these in order: ${formatLine(numbers)}`,
        answer: formatLine([...numbers].sort((a, b) => b - a)),
        choices: buildOrderChoices(numbers, 'descending'),
        hint: 'Look for the biggest number first.',
      };
    }
  }
}

export function generateLevelRound(levelId: number): MathsQuestion[] {
  const level = getMathsLevel(levelId);
  const questions: MathsQuestion[] = [];
  const seen = new Set<string>();
  while (questions.length < level.questionCount) {
    const question = createQuestion(level);
    const signature = `${question.prompt}|${question.answer}`;
    if (seen.has(signature)) continue;
    seen.add(signature);
    questions.push(question);
  }
  return questions;
}
