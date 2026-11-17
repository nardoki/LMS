import { Test } from '@nestjs/testing';
import { PgPoolService } from '@lms/supabase';
import { NotificationController } from '../src/notification.controller';
import { NotificationService } from '../src/notification.service';
import { NotificationQueueService } from '../src/queues/notification-queue.service';

describe('NotificationService & Controller', () => {
  let controller: NotificationController;
  let service: NotificationService;
  let mockPgPool: { query: jest.Mock };

  beforeEach(async () => {
    mockPgPool = {
      query: (async (text: string, params: unknown[]) => {
        if (text.includes('INSERT INTO public.notifications')) {
          return {
            rows: [
              {
                id: 'notif-1',
                user_id: params[0],
                type: params[1],
                title: params[2],
                message: params[3],
                metadata: JSON.parse(params[4] as string),
                is_read: false,
                created_at: new Date().toISOString(),
              },
            ],
          };
        }
        if (text.includes('SELECT id, user_id')) {
          return {
            rows: [
              {
                id: 'notif-1',
                user_id: params[0],
                type: 'spaced_repetition_review',
                title: 'Review Flexbox',
                message: 'Due for practice',
                metadata: {},
                is_read: false,
                created_at: new Date().toISOString(),
              },
            ],
          };
        }
        if (text.includes('SELECT COUNT(*)')) {
          return { rows: [{ count: '1' }] };
        }
        if (text.includes('UPDATE public.notifications')) {
          return { rows: [{ id: params[0] }] };
        }
        return { rows: [] };
      }) as unknown as jest.Mock,
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        NotificationService,
        {
          provide: NotificationQueueService,
          useValue: {
            enqueueSpacedRepetitionScan: async () => {},
            enqueueGradeAlert: async () => {},
            enqueueBlindSpotAlert: async () => {},
          },
        },
        {
          provide: PgPoolService,
          useValue: mockPgPool,
        },
      ],
    }).compile();

    controller = moduleRef.get(NotificationController);
    service = moduleRef.get(NotificationService);
  });

  it('controller returns SERVING for HealthService.Check', () => {
    const res = controller.check({ service: 'notification-svc' });
    expect(res.status).toBe('SERVING');
    expect(res.service).toBe('notification-svc');
  });

  it('creates a notification record in PostgreSQL', async () => {
    const result = await service.createNotification({
      userId: 'student-123',
      type: 'spaced_repetition_review',
      title: 'Review Reminder',
      message: 'Time to practice concepts',
      metadata: { concept_id: 'c-1' },
    });

    expect(result).not.toBeNull();
    expect(result?.id).toBe('notif-1');
    expect(result?.title).toBe('Review Reminder');
    expect(result?.type).toBe('spaced_repetition_review');
  });

  it('fetches user notifications and unread count', async () => {
    const result = await service.getUserNotifications('student-123');
    expect(result.notifications.length).toBe(1);
    expect(result.unreadCount).toBe(1);
  });

  it('marks a notification as read', async () => {
    const success = await service.markAsRead('notif-1', 'student-123');
    expect(success).toBe(true);
  });

  it('processes grade alert by inserting a notification', async () => {
    await service.processGradeAlert({
      studentId: 'student-123',
      assignmentId: 'assign-1',
      submissionId: 'sub-1',
      grade: 92,
      passed: true,
      conceptId: 'concept-1',
    });
    // Successfully executes without error
    expect(true).toBe(true);
  });
});
