import { Injectable, Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import axios from 'axios';

import { PUSH_API_URL } from 'src/common/consts';

@Processor('notifications')
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  @Process('sendNotification')
  async handleSendNotification(job: Job) {
    const { userId } = job.data;

    if (!userId) {
      throw new Error('UserId is required');
    }

    try {
      const response = await axios.post(PUSH_API_URL, { userId });

      this.logger.log(`Notification sent for user ${userId}: ${response.data}`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification for user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
