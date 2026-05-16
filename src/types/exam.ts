export interface Topic {
  id: string;
  name: string;
}

export interface Exam {
  id: string;
  name: string;
  code: string;
  provider: string;
  passingScore: number;
  defaultQuestionCount: number;
  defaultDurationMinutes: number;
  topics: Topic[];
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface RawQuestion {
  id: string;
  topicId: string;
  statement: string;
  options: QuestionOption[];
  correctOptionIds: string[];
  explanation: string;
}

export interface Question extends RawQuestion {
  examId: string;
  multi: boolean;
}

export interface Dataset {
  exams: Exam[];
  questions: Question[];
}

export interface DatasetFile {
  exam: Exam;
  questions: RawQuestion[];
}

export interface ExamConfig {
  examId: string;
  count: number;
  timeLimitMs: number | null;
  showFeedback: boolean;
  shuffleAnswers: boolean;
  topicFilter: string; // topicId | 'all'
}

export interface AttemptAnswer {
  questionId: string;
  topicId: string;
  selected: string[];
  correct: boolean;
  skipped: boolean;
  elapsedMs: number;
  flagged: boolean;
}

export interface Attempt {
  id: string;
  examId: string;
  examName: string;
  label: string;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  timeLimitMs: number | null;
  showFeedback: boolean;
  total: number;
  correctCount: number;
  answers: AttemptAnswer[];
}

export type Route =
  | { name: 'home' }
  | { name: 'setup'; examId: string }
  | { name: 'exam'; config: ExamConfig }
  | { name: 'summary'; attemptId: string }
  | { name: 'history' }
  | { name: 'review' };
