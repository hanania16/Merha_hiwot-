import { Module } from '@nestjs/common';
import { GlobalNotificationsService } from './notifications.service';
import { GlobalNotificationsController } from './notifications.controller';

@Module({
  providers: [GlobalNotificationsService],
  controllers: [GlobalNotificationsController],
  exports: [GlobalNotificationsService],
})
export class GlobalNotificationsModule {}
