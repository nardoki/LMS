export const EVENT_PATTERNS = {
  ANSWER_RECORDED: 'answer.recorded',
  ENROLLMENT_CONFIRMED: 'enrollment.confirmed',
  SUBMISSION_GRADED: 'submission.graded',
} as const;

export interface AnswerRecordedEvent {
  attemptId: string;
  studentId: string;
  conceptId: string;
  questionId: string;
  correct: boolean;
  difficulty: number;
  timeTakenSec: number;
  answeredAt: string;
}

export interface EnrollmentConfirmedEvent {
  enrollmentId: string;
  studentId: string;
  courseId: string;
  enrolledAt: string;
}

export interface SubmissionGradedEvent {
  submissionId: string;
  assignmentId: string;
  studentId: string;
  conceptId: string;
  grade: number;
  passed: boolean;
  gradedAt: string;
}
