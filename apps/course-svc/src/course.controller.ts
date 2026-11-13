import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { GRPC_SERVICES, HealthCheckRequest, HealthCheckResponse } from '@lms/common';
import { CourseService } from './course.service';

@Controller()
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @GrpcMethod(GRPC_SERVICES.HEALTH, 'Check')
  check(_request: HealthCheckRequest): HealthCheckResponse {
    return this.courseService.checkHealth();
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'CreateCourse')
  createCourse(req: {
    instructor_id: string;
    title: string;
    description: string;
    is_published: boolean;
  }) {
    return this.courseService.createCourse(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'GetCourse')
  getCourse(req: { course_id: string }) {
    return this.courseService.getCourse(req.course_id);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'ListCourses')
  listCourses(req: { published_only: boolean; instructor_id?: string }) {
    return this.courseService.listCourses(req.published_only, req.instructor_id);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'UpdateCourse')
  updateCourse(req: {
    course_id: string;
    actor_id: string;
    actor_role: string;
    title?: string;
    description?: string;
    has_is_published?: boolean;
    is_published?: boolean;
  }) {
    return this.courseService.updateCourse(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'DeleteCourse')
  deleteCourse(req: { course_id: string; actor_id: string; actor_role: string }) {
    return this.courseService.deleteCourse(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'AddModule')
  addModule(req: {
    course_id: string;
    actor_id: string;
    actor_role: string;
    title: string;
    order_index: number;
    status: string;
  }) {
    return this.courseService.addModule(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'UpdateModule')
  updateModule(req: {
    module_id: string;
    actor_id: string;
    actor_role: string;
    title?: string;
    order_index?: number;
    has_order_index?: boolean;
    status?: string;
  }) {
    return this.courseService.updateModule(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'DeleteModule')
  deleteModule(req: { module_id: string; actor_id: string; actor_role: string }) {
    return this.courseService.deleteModule(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'AddLesson')
  addLesson(req: {
    module_id: string;
    actor_id: string;
    actor_role: string;
    concept_id?: string;
    title: string;
    content_markdown: string;
    media_url?: string;
    order_index: number;
    status: string;
  }) {
    return this.courseService.addLesson(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'GetLesson')
  getLesson(req: { lesson_id: string }) {
    return this.courseService.getLesson(req.lesson_id);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'UpdateLesson')
  updateLesson(req: {
    lesson_id: string;
    actor_id: string;
    actor_role: string;
    concept_id?: string;
    title?: string;
    content_markdown?: string;
    media_url?: string;
    order_index?: number;
    has_order_index?: boolean;
    status?: string;
  }) {
    return this.courseService.updateLesson(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'DeleteLesson')
  deleteLesson(req: { lesson_id: string; actor_id: string; actor_role: string }) {
    return this.courseService.deleteLesson(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'TagLessonConcept')
  tagLessonConcept(req: {
    lesson_id: string;
    concept_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    return this.courseService.tagLessonConcept(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'CreateConcept')
  createConcept(req: {
    course_id: string;
    actor_id: string;
    actor_role: string;
    name: string;
    description: string;
    difficulty: number;
  }) {
    return this.courseService.createConcept(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'UpdateConcept')
  updateConcept(req: {
    concept_id: string;
    actor_id: string;
    actor_role: string;
    name?: string;
    description?: string;
    difficulty?: number;
  }) {
    return this.courseService.updateConcept(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'DeleteConcept')
  deleteConcept(req: { concept_id: string; actor_id: string; actor_role: string }) {
    return this.courseService.deleteConcept(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'AddConceptPrerequisite')
  addConceptPrerequisite(req: {
    concept_id: string;
    requires_concept_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    return this.courseService.addConceptPrerequisite(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'RemoveConceptPrerequisite')
  removeConceptPrerequisite(req: {
    concept_id: string;
    requires_concept_id: string;
    actor_id: string;
    actor_role: string;
  }) {
    return this.courseService.removeConceptPrerequisite(req);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'GetCoursePath')
  getCoursePath(req: { course_id: string; student_id: string }) {
    return this.courseService.getCoursePath(req.course_id);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'Enroll')
  enroll(req: { student_id: string; course_id: string }) {
    return this.courseService.enroll(req.student_id, req.course_id);
  }

  @GrpcMethod(GRPC_SERVICES.COURSE, 'GetCourseEnrollments')
  getCourseEnrollments(req: { course_id: string }) {
    return this.courseService.getCourseEnrollments(req.course_id);
  }
}
