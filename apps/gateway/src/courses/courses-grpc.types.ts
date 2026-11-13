import { Observable } from 'rxjs';

export interface CourseGrpcServiceClient {
  createCourse(req: Record<string, unknown>): Observable<unknown>;
  getCourse(req: { course_id: string }): Observable<unknown>;
  listCourses(req: { published_only: boolean; instructor_id?: string }): Observable<unknown>;
  updateCourse(req: Record<string, unknown>): Observable<unknown>;
  deleteCourse(req: Record<string, unknown>): Observable<unknown>;

  addModule(req: Record<string, unknown>): Observable<unknown>;
  updateModule(req: Record<string, unknown>): Observable<unknown>;
  deleteModule(req: Record<string, unknown>): Observable<unknown>;

  addLesson(req: Record<string, unknown>): Observable<unknown>;
  getLesson(req: { lesson_id: string }): Observable<unknown>;
  updateLesson(req: Record<string, unknown>): Observable<unknown>;
  deleteLesson(req: Record<string, unknown>): Observable<unknown>;
  tagLessonConcept(req: Record<string, unknown>): Observable<unknown>;

  createConcept(req: Record<string, unknown>): Observable<unknown>;
  updateConcept(req: Record<string, unknown>): Observable<unknown>;
  deleteConcept(req: Record<string, unknown>): Observable<unknown>;
  addConceptPrerequisite(req: Record<string, unknown>): Observable<unknown>;
  removeConceptPrerequisite(req: Record<string, unknown>): Observable<unknown>;
  getCoursePath(req: { course_id: string; student_id: string }): Observable<unknown>;

  enroll(req: { student_id: string; course_id: string }): Observable<unknown>;
}
