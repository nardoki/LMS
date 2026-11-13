import {
  Controller,
  ForbiddenException,
  Get,
  Inject,
  OnModuleInit,
  Param,
  Query,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import {
  AuthUser,
  callGrpc,
  CurrentUser,
  GRPC_CLIENTS,
  GRPC_SERVICES,
  ParsePgUuidPipe,
  Role,
  Roles,
} from '@lms/common';

interface MasteryGrpcClient {
  getHeatmap(req: { student_id: string; course_id: string }): Observable<unknown>;
  getSmartQueue(req: { student_id: string; course_id: string }): Observable<unknown>;
  getClassReport(req: { course_id: string }): Observable<unknown>;
}

@ApiTags('mastery')
@ApiBearerAuth()
@Controller('mastery')
export class MasteryController implements OnModuleInit {
  private masteryClient!: MasteryGrpcClient;

  constructor(
    @Inject(GRPC_CLIENTS.MASTERY) private readonly grpcClient: ClientGrpc,
  ) {}

  onModuleInit(): void {
    this.masteryClient = this.grpcClient.getService<MasteryGrpcClient>(
      GRPC_SERVICES.MASTERY,
    );
  }

  private resolveTargetStudent(user: AuthUser, studentId?: string): string {
    if (!studentId || studentId === user.id) {
      return user.id;
    }
    if (user.role === Role.INSTRUCTOR || user.role === Role.ADMIN) {
      return studentId;
    }
    throw new ForbiddenException('Students may only view their own mastery data');
  }

  @Get('courses/:courseId/heatmap')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Get live concept mastery heatmap for a student in a course' })
  @ApiQuery({ name: 'studentId', required: false })
  getHeatmap(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Query('studentId') studentId?: string,
  ) {
    return callGrpc(
      this.masteryClient.getHeatmap({
        student_id: this.resolveTargetStudent(user, studentId),
        course_id: courseId,
      }),
    );
  }

  @Get('courses/:courseId/smart-queue')
  @Roles(Role.STUDENT, Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Get ranked practice queue (blind spots + overdue reviews first)' })
  @ApiQuery({ name: 'studentId', required: false })
  getSmartQueue(
    @CurrentUser() user: AuthUser,
    @Param('courseId') courseId: string,
    @Query('studentId') studentId?: string,
  ) {
    return callGrpc(
      this.masteryClient.getSmartQueue({
        student_id: this.resolveTargetStudent(user, studentId),
        course_id: courseId,
      }),
    );
  }

  @Get('courses/:courseId/class-report')
  @Roles(Role.INSTRUCTOR, Role.ADMIN)
  @ApiOperation({ summary: 'Get class-wide blind-spot aggregation report for a course' })
  getClassReport(@Param('courseId') courseId: string) {
    return callGrpc(
      this.masteryClient.getClassReport({ course_id: courseId }),
    );
  }
}
