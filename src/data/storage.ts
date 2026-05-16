import type { Attempt } from '../types/exam';

const KEY = 'examsim.attempts.v1';

export function getAttempts(): Attempt[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]');
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: Attempt): void {
  const all = getAttempts();
  all.unshift(attempt);
  localStorage.setItem(KEY, JSON.stringify(all.slice(0, 100)));
}

export function deleteAttempt(id: string): void {
  const all = getAttempts().filter((a) => a.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function getAttempt(id: string): Attempt | undefined {
  return getAttempts().find((a) => a.id === id);
}
