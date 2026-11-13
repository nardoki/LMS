import { jest } from '@jest/globals';
import { RpcException } from '@nestjs/microservices';
import { of } from 'rxjs';
import { CourseService } from '../src/course.service';
import { CourseRepository } from '../src/repository/course.repository';

describe('CourseService', () => {
  function makeService(repoOverrides: Partial<CourseRepository> = {}, seedCount = 2) {
    const seedMock = jest.fn(() => of({ seeded_count: seedCount }));
    const repo = {
      findCourseById: jest.fn<() => Promise<any>>(),
      upsertEnrollment: jest.fn<() => Promise<any>>(),
      listConceptsByCourse: jest.fn<() => Promise<any[]>>(),
      ...repoOverrides,
    } as unknown as CourseRepository;

    const grpcClient = {
      getService: () => ({ seedStudentMastery: seedMock }),
    };

    const service = new CourseService(repo, grpcClient as never);
    service.onModuleInit();
    return { service, repo, seedMock };
  }

  it('detects circular prerequisite chains in concept DAG', () => {
    const { service } = makeService();
    const edges = [
      { conceptId: 'B', requiresId: 'A' },
      { conceptId: 'C', requiresId: 'B' },
    ];

    // A requiring C would create A -> C -> B -> A
    expect(service.wouldCreateCycle(edges, 'A', 'C')).toBe(true);
    // D requiring C is acyclic
    expect(service.wouldCreateCycle(edges, 'D', 'C')).toBe(false);
  });

  it('blocks non-owning instructors from updating another instructor course', async () => {
    const { service } = makeService({
      findCourseById: jest.fn<() => Promise<any>>().mockResolvedValue({
        id: 'course-1',
        instructor_id: 'owner-1',
        title: 'Demo',
      }),
    });

    await expect(
      service.updateCourse({
        course_id: 'course-1',
        actor_id: 'other-instructor',
        actor_role: 'instructor',
        title: 'Hijacked',
      }),
    ).rejects.toThrow(RpcException);
  });

  it('seeds mastery rows via gRPC when enrolling a student', async () => {
    const { service, seedMock } = makeService({
      findCourseById: jest.fn<() => Promise<any>>().mockResolvedValue({ id: 'course-1', title: 'Intro' }),
      upsertEnrollment: jest.fn<() => Promise<any>>().mockResolvedValue({
        id: 'enr-1',
        student_id: 'stu-1',
        course_id: 'course-1',
        status: 'active',
        enrolled_at: '2026-11-12T00:00:00Z',
      }),
      listConceptsByCourse: jest.fn<() => Promise<any[]>>().mockResolvedValue([
        { id: 'c1', course_id: 'course-1', name: 'HTML', difficulty: 1 },
        { id: 'c2', course_id: 'course-1', name: 'CSS', difficulty: 2 },
      ]),
    });

    const result = await service.enroll('stu-1', 'course-1');

    expect(seedMock).toHaveBeenCalledWith({
      student_id: 'stu-1',
      concept_ids: ['c1', 'c2'],
    });
    expect(result.seeded_concepts_count).toBe(2);
  });
});
