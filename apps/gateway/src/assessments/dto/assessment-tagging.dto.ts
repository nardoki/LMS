import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { IsPgUuid } from '@lms/common';

export class CreateQuestionDto {
  @ApiProperty({ format: 'uuid' })
  @IsPgUuid()
  conceptId: string;

  @ApiProperty({ example: 'What HTTP status code means Forbidden?' })
  @IsString()
  @MinLength(3)
  questionText: string;

  @ApiProperty({ example: ['401', '403', '404', '500'] })
  @IsArray()
  @ArrayMinSize(2)
  @IsString({ each: true })
  options: string[];

  @ApiProperty({ example: '403' })
  @IsString()
  correctAnswer: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 5, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  difficulty?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDiagnostic?: boolean;
}

export class SubmitAnswerDto {
  @ApiProperty({ format: 'uuid' })
  @IsPgUuid()
  questionId: string;

  @ApiProperty({ example: '<main>' })
  @IsString()
  selectedAnswer: string;

  @ApiPropertyOptional({ example: 14, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  timeTakenSec?: number;
}

export class CreateAssignmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsPgUuid()
  conceptId: string;

  @ApiProperty({ example: 'Build a Responsive Grid' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['remedial', 'standard', 'challenge'], default: 'standard' })
  @IsOptional()
  @IsIn(['remedial', 'standard', 'challenge'])
  tier?: 'remedial' | 'standard' | 'challenge';

  @ApiPropertyOptional({ example: '2026-12-01' })
  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class UpdateAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['remedial', 'standard', 'challenge'] })
  @IsOptional()
  @IsIn(['remedial', 'standard', 'challenge'])
  tier?: 'remedial' | 'standard' | 'challenge';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class SubmitAssignmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ example: 'Here is my solution explanation and link.' })
  @IsOptional()
  @IsString()
  contentText?: string;
}

export class GradeSubmissionDto {
  @ApiProperty({ minimum: 0, maximum: 100, example: 88 })
  @IsNumber()
  @Min(0)
  @Max(100)
  grade: number;

  @ApiPropertyOptional({ example: 'Great work on flex alignment.' })
  @IsOptional()
  @IsString()
  feedback?: string;
}

export class TagAssessmentConceptDto {
  @ApiProperty({ format: 'uuid' })
  @IsPgUuid()
  conceptId: string;
}
