import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Role, Roles } from '@lms/common';
import { PgPoolService } from '@lms/supabase';

export interface GatewayNotificationItem {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface MyNotificationsResponse {
  unread_count: number;
  notifications: GatewayNotificationItem[];
}

@ApiTags('notifications')
@Controller('notifications')
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly pgPool: PgPoolService) {}

  @Get('my')
  @ApiOperation({ summary: 'Get recent notifications and unread count for current user' })
  async getMyNotifications(
    @CurrentUser() user: AuthUser,
    @Query('limit') limitStr?: string,
  ): Promise<MyNotificationsResponse> {
    const limit = Math.min(Math.max(parseInt(limitStr || '20', 10), 1), 50);

    const [listRes, countRes] = await Promise.all([
      this.pgPool.query<GatewayNotificationItem>(
        `SELECT id, user_id, type, title, message, metadata, is_read, created_at
         FROM public.notifications
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [user.id, limit],
      ),
      this.pgPool.query<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM public.notifications
         WHERE user_id = $1 AND is_read = false`,
        [user.id],
      ),
    ]);

    return {
      unread_count: parseInt(countRes.rows[0]?.count || '0', 10),
      notifications: listRes.rows,
    };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    const res = await this.pgPool.query(
      `UPDATE public.notifications
       SET is_read = true
       WHERE id = $1 AND user_id = $2
       RETURNING id, is_read`,
      [id, user.id],
    );

    return {
      success: res.rows.length > 0,
      id,
    };
  }

  @Post('trigger-scan')
  @Roles(Role.ADMIN, Role.INSTRUCTOR)
  @ApiOperation({ summary: 'Trigger a spaced-repetition due review scan across students' })
  async triggerSpacedReviewScan(): Promise<{
    status: string;
    scanned_due_records: number;
    notifications_dispatched: number;
  }> {
    // Scans concept mastery for students whose review is due
    const res = await this.pgPool.query<{
      student_id: string;
      concept_id: string;
      concept_name: string;
      course_id: string;
      mastery: number;
    }>(
      `SELECT
         m.student_id,
         m.concept_id,
         m.mastery,
         c.name AS concept_name,
         c.course_id
       FROM mastery.student_concept_mastery m
       JOIN course.concepts c ON c.id = m.concept_id
       WHERE m.next_review_at IS NOT NULL
         AND m.next_review_at <= now()
         AND m.mastery < 0.95
       LIMIT 50`,
    );

    let createdCount = 0;
    for (const row of res.rows) {
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
        await this.pgPool.query(
          `INSERT INTO public.notifications (user_id, type, title, message, metadata)
           VALUES ($1, $2, $3, $4, $5::jsonb)`,
          [
            row.student_id,
            'spaced_repetition_review',
            `Time to Review: ${row.concept_name}`,
            `Spaced repetition interval reached. Complete a diagnostic booster quiz to reinforce your knowledge.`,
            JSON.stringify({
              concept_id: row.concept_id,
              concept_name: row.concept_name,
              course_id: row.course_id,
              mastery: row.mastery,
            }),
          ],
        );
        createdCount++;
      }
    }

    return {
      status: 'completed',
      scanned_due_records: res.rows.length,
      notifications_dispatched: createdCount,
    };
  }
}
