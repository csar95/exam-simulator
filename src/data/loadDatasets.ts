import type { Dataset, DatasetFile, Question } from '../types/exam';

const datasetModules = import.meta.glob<DatasetFile>('../datasets/*.json', {
  eager: true,
  import: 'default',
});

let _cached: Dataset | null = null;

export function loadDataset(): Dataset {
  if (_cached) return _cached;

  const exams = [];
  const questions: Question[] = [];

  for (const file of Object.values(datasetModules)) {
    const exam = file.exam;
    exams.push(exam);
    for (const q of file.questions) {
      questions.push({
        ...q,
        examId: exam.id,
        multi: (q.correctOptionIds || []).length > 1,
      });
    }
  }

  _cached = { exams, questions };
  return _cached;
}

export function topicNameOf(dataset: Dataset, examId: string, topicId: string): string {
  const exam = dataset.exams.find((e) => e.id === examId);
  if (!exam) return topicId;
  return exam.topics.find((t) => t.id === topicId)?.name ?? topicId;
}
