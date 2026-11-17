import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import {
  createHealthResponse,
  HealthCheckRequest,
  HealthCheckResponse,
} from '@lms/common';
import { NotificationService } from './notification.service';
import { NotificationQueueService } from './queues/notification-queue.service';

@Controller()
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly queueService: NotificationQueueService,
  ) {}

  @GrpcMethod('HealthService', 'Check')
  check(request: HealthCheckRequest): HealthCheckResponse {
    return createHealthResponse(request.service || 'notification-svc');
  }
}
