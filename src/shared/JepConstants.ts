import { JepContestants } from '../types/schemas/jepContestants';

export const JEP_CONTESTANT_COUNT = 3;
export const JEP_CATEGORY_COUNT = 6;
export const JEP_CLUES_PER_CATEGORY = 5;
export const JEP_DAILY_DOUBLE_MIN_WAGER = 5;
export const JEP_CLUE_VALUE_MULTIPLIER = 200;
export const JEP_FINAL_JEOPARDY_CATEGORY_COUNT = 1;
export const JEP_FINAL_JEOPARDY_CLUES_PER_CATEGORY = 1;
export const JEP_FINAL_JEOPARDY_MIN_MAX_WAGER_SIZE = 100;

export type JepContestantUpdate = (Omit<JepContestants[number], 'score'> & { score: number | null })[];
