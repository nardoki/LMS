import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  OnModuleInit,
  Param,
  Post,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import {
  AuthUser,
  callGrpc,
  CurrentUser,
  GRPC_CLIENTS,
  GRPC_SERVICES,
  Public,
  Role,
  Roles,
} from '@lms/common';
import { PgPoolService } from '@lms/supabase';
import { CourseGrpcServiceClient } from '../courses/courses-grpc.types';
import { IssueCertificateDto, OdooEnrollmentWebhookDto } from './dto/odoo.dto';

@ApiTags('odoo-and-certificates')
@Controller()
export class OdooController implements OnModuleInit {
  private courseClient!: CourseGrpcServiceClient;

  constructor(
    @Inject(GRPC_CLIENTS.COURSE) private readonly grpcClient: ClientGrpc,
    private readonly pgPool: PgPoolService,
  ) {}

  onModuleInit(): void {
    this.courseClient = this.grpcClient.getService<CourseGrpcServiceClient>(
      GRPC_SERVICES.COURSE,
    );
  }

  // ---------------------------------------------------------------------------
  // 1. Odoo Community Webhook: Enrollment & Payment Sync
  // ---------------------------------------------------------------------------
  @Public()
  @Post('odoo/webhook/enrollment')
  @ApiOperation({ summary: 'Odoo webhook: trigger student enrollment upon payment confirmation' })
  async handleOdooEnrollment(@Body() dto: OdooEnrollmentWebhookDto) {
    const enrollResult = await callGrpc(
      this.courseClient.enroll({
        student_id: dto.student_id,
        course_id: dto.course_id,
      }),
    );

    return {
      status: 'enrolled',
      odoo_ref: dto.odoo_ref ?? 'ODOO-PAYMENT',
      student_id: dto.student_id,
      course_id: dto.course_id,
      enrollment: enrollResult,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. Issue Completion Certificate (student completes course)
  // ---------------------------------------------------------------------------
  @Post('certificates/issue')
  @ApiBearerAuth()
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Issue a verifiable completion certificate' })
  async issueCertificate(
    @CurrentUser() user: AuthUser,
    @Body() dto: IssueCertificateDto,
  ) {
    // Verify enrollment
    const enrollmentRes = await this.pgPool.query(
      `SELECT id FROM course.enrollments WHERE student_id = $1 AND course_id = $2`,
      [user.id, dto.courseId],
    );

    if (enrollmentRes.rows.length === 0) {
      throw new BadRequestException('Student is not enrolled in this course');
    }

    // Fetch mastered concepts for this course
    const masteredRes = await this.pgPool.query<{ name: string }>(
      `SELECT c.name
       FROM course.concepts c
       JOIN mastery.student_concept_mastery m ON m.concept_id = c.id
       WHERE c.course_id = $1 AND m.student_id = $2 AND m.mastery >= 0.4`,
      [dto.courseId, user.id],
    );

    const masteredConceptNames = masteredRes.rows.map((r) => r.name);
    const verificationCode = `MLMS-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Cryptographic tamper-evident payload hash
    const payloadToHash = JSON.stringify({
      student_id: user.id,
      course_id: dto.courseId,
      verification_code: verificationCode,
      mastered_concepts: [...masteredConceptNames].sort(),
    });
    const payloadHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

    // Verification URL & QR code
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3100';
    const verificationUrl = `${baseUrl}/verify/${verificationCode}`;
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 220 });
    } catch {
      qrCodeDataUrl = '';
    }

    // Upsert into public.certificates
    const certRes = await this.pgPool.query<{
      id: string;
      student_id: string;
      course_id: string;
      verification_code: string;
      payload_hash: string;
      mastered_concepts_json: unknown[];
      issued_at: string;
    }>(
      `INSERT INTO public.certificates (student_id, course_id, verification_code, payload_hash, mastered_concepts_json, issued_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, now())
       ON CONFLICT (student_id, course_id)
       DO UPDATE SET
         verification_code = EXCLUDED.verification_code,
         payload_hash = EXCLUDED.payload_hash,
         mastered_concepts_json = EXCLUDED.mastered_concepts_json,
         issued_at = now()
       RETURNING id, student_id, course_id, verification_code, payload_hash, mastered_concepts_json, issued_at`,
      [user.id, dto.courseId, verificationCode, payloadHash, JSON.stringify(masteredConceptNames)],
    );

    const cert = certRes.rows[0];
    return {
      id: cert.id,
      student_id: cert.student_id,
      course_id: cert.course_id,
      verification_code: cert.verification_code,
      payload_hash: cert.payload_hash || payloadHash,
      verification_url: verificationUrl,
      qr_code_data_url: qrCodeDataUrl,
      mastered_concepts: cert.mastered_concepts_json,
      issued_at: cert.issued_at,
    };
  }

  // ---------------------------------------------------------------------------
  // 3. Public Certificate Verification by Code
  // ---------------------------------------------------------------------------
  @Public()
  @Get('certificates/verify/:code')
  @ApiOperation({ summary: 'Public verification endpoint for certificate by code' })
  async verifyCertificate(@Param('code') code: string) {
    const res = await this.pgPool.query(
      `SELECT
         cert.id,
         cert.student_id,
         cert.course_id,
         cert.verification_code,
         cert.payload_hash,
         cert.mastered_concepts_json,
         cert.issued_at,
         p.name AS student_name,
         p.email AS student_email,
         c.title AS course_title,
         c.description AS course_description,
         inst.name AS instructor_name
       FROM public.certificates cert
       JOIN public.profiles p ON p.id = cert.student_id
       JOIN course.courses c ON c.id = cert.course_id
       LEFT JOIN public.profiles inst ON inst.id = c.instructor_id
       WHERE cert.verification_code = $1`,
      [code],
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Certificate with verification code "${code}" not found.`);
    }

    const row = res.rows[0];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3100';
    const verificationUrl = `${baseUrl}/verify/${row.verification_code}`;
    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 220 });
    } catch {
      qrCodeDataUrl = '';
    }

    const payloadHash = row.payload_hash || crypto.createHash('sha256').update(JSON.stringify({
      student_id: row.student_id,
      course_id: row.course_id,
      verification_code: row.verification_code,
      mastered_concepts: Array.isArray(row.mastered_concepts_json) ? [...row.mastered_concepts_json].sort() : [],
    })).digest('hex');

    return {
      valid: true,
      id: row.id,
      verification_code: row.verification_code,
      payload_hash: payloadHash,
      verification_url: verificationUrl,
      qr_code_data_url: qrCodeDataUrl,
      student_name: row.student_name || 'Student',
      course_title: row.course_title,
      instructor_name: row.instructor_name || 'MasteryLMS Faculty',
      issued_at: row.issued_at,
      mastered_concepts: Array.isArray(row.mastered_concepts_json)
        ? row.mastered_concepts_json
        : [],
    };
  }

  // ---------------------------------------------------------------------------
  // 4. Current User's Certificates
  // ---------------------------------------------------------------------------
  @Get('certificates/my')
  @ApiBearerAuth()
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'List certificates earned by current student' })
  async listMyCertificates(@CurrentUser() user: AuthUser) {
    const res = await this.pgPool.query<{
      id: string;
      verification_code: string;
      payload_hash: string | null;
      mastered_concepts_json: unknown[];
      issued_at: string;
      course_title: string;
    }>(
      `SELECT
         cert.id,
         cert.verification_code,
         cert.payload_hash,
         cert.mastered_concepts_json,
         cert.issued_at,
         c.title AS course_title
       FROM public.certificates cert
       JOIN course.courses c ON c.id = cert.course_id
       WHERE cert.student_id = $1
       ORDER BY cert.issued_at DESC`,
      [user.id],
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3100';

    const certificates = await Promise.all(
      res.rows.map(async (r) => {
        const verificationUrl = `${baseUrl}/verify/${r.verification_code}`;
        let qrCodeDataUrl = '';
        try {
          qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 220 });
        } catch {
          qrCodeDataUrl = '';
        }
        return {
          id: r.id,
          verification_code: r.verification_code,
          payload_hash: r.payload_hash || '',
          verification_url: verificationUrl,
          qr_code_data_url: qrCodeDataUrl,
          course_title: r.course_title,
          mastered_concepts: Array.isArray(r.mastered_concepts_json)
            ? r.mastered_concepts_json
            : [],
          issued_at: r.issued_at,
        };
      }),
    );

    return { certificates };
  }
}
