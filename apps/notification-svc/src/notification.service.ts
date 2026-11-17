import { Injectable, Logger } from '@nestjs/common';
import { PgPoolService } from '@lms/supabase';
import { GradeAlertJobData, BlindSpotJobData, SpacedReviewJobData } from './queues/notification-queue.service';

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly pgPool: PgPoolService) {}

  /**
   * Inserts a notification record into public.notifications.
   */
  async createNotification(params: {
    userId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<NotificationRecord | null> {
    try {
      const res = await this.pgPool.query<NotificationRecord>(
        `INSERT INTO public.notifications (user_id, type, title, message, metadata)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         RETURNING id, user_id, type, title, message, metadata, is_read, created_at`,
        [
          params.userId,
          params.type,
          params.title,
          params.message,
          JSON.stringify(params.metadata || {}),
        ],
      );

      return res.rows[0] ?? null;
    } catch (err: unknown) {
      this.logger.error(
        `Failed inserting notification for user ${params.userId}: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }

  /**
   * Scans for concepts due for spaced-repetition review (next_review_at <= NOW()).
   * Enqueues review notification for each student due for recall practice.
   */
  async processDueSpacedReviews(data?: SpacedReviewJobData): Promise<number> {
    this.logger.log('Scanning for due spaced-repetition reviews...');

    try {
      let query = `
        SELECT
          m.student_id,
          m.concept_id,
          m.mastery,
          m.confidence,
          m.next_review_at,
          c.name AS concept_name,
          c.course_id
        FROM mastery.student_concept_mastery m
        JOIN course.concepts c ON c.id = m.concept_id
        WHERE m.next_review_at IS NOT NULL
          AND m.next_review_at <= now()
          AND m.mastery < 0.95
      `;
      const queryParams: unknown[] = [];

      if (data?.studentId) {
        queryParams.push(data.studentId);
        query += ` AND m.student_id = $${queryParams.length}`;
      }

      const res = await this.pgPool.query<{
        student_id: string;
        concept_id: string;
        mastery: number;
        confidence: number;
        next_review_at: string;
        concept_name: string;
        course_id: string;
      }>(query, queryParams);

      let createdCount = 0;
      for (const row of res.rows) {
        // Prevent duplicate unread reminders for the same concept within 24h
        const recentCheck = await this.pgPool.query(
          `SELECT id FROM public.notifications
           WHERE user_id = $1
             AND type = 'spaced_repetition_review'
             AND (metadata->>'concept_id')::text = $2
             AND created_at > now() - interval '24 hours'
           LIMIT 1`,
          [row.student_id, row.concept_id],
        );

        if (recentCheck.rows.length === 0) {
          await this.createNotification({
            userId: row.student_id,
            type: 'spaced_repetition_review',
            title: `Time to Review: ${row.concept_name}`,
            message: `Your retention decay threshold has been reached. Complete a quick booster quiz on "${row.concept_name}" to lock in your mastery!`,
            metadata: {
              concept_id: row.concept_id,
              concept_name: row.concept_name,
              course_id: row.course_id,
              mastery: row.mastery,
            },
          });
          createdCount++;
        }
      }

      this.logger.log(`Spaced repetition scan complete: created ${createdCount} reminders.`);
      return createdCount;
    } catch (err: unknown) {
      this.logger.error(`Error processing due spaced reviews: ${err instanceof Error ? err.message : String(err)}`);
      return 0;
    }
  }

  /**
   * Processes a grade alert when an assignment is scored.
   */
  async processGradeAlert(job: GradeAlertJobData): Promise<void> {
    const passedText = job.passed ? 'Passed with distinction' : 'Needs revision';
    await this.createNotification({
      userId: job.studentId,
      type: 'grade_alert',
      title: `Assignment Graded: ${job.grade}% (${passedText})`,
      message: `Your assignment submission has been reviewed by your instructor. Final score: ${job.grade}%.`,
      metadata: {
        assignment_id: job.assignmentId,
        submission_id: job.submissionId,
        grade: job.grade,
        passed: job.passed,
        concept_id: job.conceptId,
      },
    });
  }

  /**
   * Processes a blind spot warning when mastery drops below 0.4.
   */
  async processBlindSpotAlert(job: BlindSpotJobData): Promise<void> {
    const conceptName = job.conceptName || 'Fundamental Concept';
    await this.createNotification({
      userId: job.studentId,
      type: 'blind_spot_warning',
      title: `Blind Spot Alert: ${conceptName}`,
      message: `Diagnostic quizzes indicate a conceptual blind spot in "${conceptName}". A remedial lesson and practice set has been added to your queue.`,
      metadata: {
        concept_id: job.conceptId,
        concept_name: conceptName,
        course_id: job.courseId,
      },
    });
  }

  /**
   * Fetches unread & recent notifications for a user.
   */
  async getUserNotifications(userId: string, limit = 20): Promise<{
    notifications: NotificationRecord[];
    unreadCount: number;
  }> {
    const [listRes, countRes] = await Promise.all([
      this.pgPool.query<NotificationRecord>(
        `SELECT id, user_id, type, title, message, metadata, is_read, created_at
         FROM public.notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [userId, limit],
      ),
      this.pgPool.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM public.notifications
         WHERE user_id = $1 AND is_read = false`,
        [userId],
      ),
    ]);

    return {
      notifications: listRes.rows,
      unreadCount: parseInt(countRes.rows[0]?.count || '0', 10),
    };
  }

  /**
   * Marks a notification as read.
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const res = await this.pgPool.query(
      `UPDATE public.notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [notificationId, userId],
    );

    return res.rows.length > 0;
  }
}
