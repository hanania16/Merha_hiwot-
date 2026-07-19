import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { GlobalNotificationsService } from './notifications.service';
import { CurrentUser, CurrentUserPayload } from '../decorators/current-user.decorator';
import { Role } from '@prisma/client';

/** Unified bell-icon feed for both dashboards, filtered per role. */
@Controller('notifications')
export class GlobalNotificationsController {
  constructor(private notificationsService: GlobalNotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload, @Query('unread') unread?: string) {
    return this.notificationsService.findForRole(user.role as Role, unread === 'true');
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.unreadCount(user.role as Role);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.notificationsService.markAllRead(user.role as Role);
  }
}
