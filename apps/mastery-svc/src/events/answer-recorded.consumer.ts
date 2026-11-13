import { Injectable, Logger } from '@nestjs/common';
import { AnswerRecordedEvent } from '@lms/common';
import { MasteryService } from '../mastery.service';

@Injectable()
export class AnswerRecordedConsumer {
  private readonly logger = new Logger(AnswerRecordedConsumer.name);

  constructor(private readonly masteryService: MasteryService) {}

  async handle(event: AnswerRecordedEvent) {
    this.logger.debug(
      `Consuming AnswerRecorded student=${event.studentId} concept=${event.conceptId} correct=${event.correct}`,
    );
    return this.masteryService.recordAnswer({
      student_id: event.studentId,
      concept_id: event.conceptId,
      correct: event.correct,
      difficulty: event.difficulty,
      time_taken_sec: event.timeTakenSec,
    });
  }
}
