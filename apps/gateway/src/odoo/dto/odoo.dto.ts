import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { IsPgUuid } from '@lms/common';

export class OdooEnrollmentWebhookDto {
  @ApiProperty({ description: 'Supabase Student UUID' })
  @IsPgUuid()
  @IsNotEmpty()
  student_id!: string;

  @ApiProperty({ description: 'Mastery Course UUID' })
  @IsPgUuid()
  @IsNotEmpty()
  course_id!: string;

  @ApiPropertyOptional({ description: 'Odoo Enrollment Reference' })
  @IsString()
  @IsOptional()
  odoo_ref?: string;

  @ApiPropertyOptional({ description: 'Student Email' })
  @IsString()
  @IsOptional()
  student_email?: string;
}

export class IssueCertificateDto {
  @ApiProperty({ description: 'Course UUID to issue certificate for' })
  @IsPgUuid()
  @IsNotEmpty()
  courseId!: string;
}
