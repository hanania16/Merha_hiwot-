import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import {
  CommunicationsService,
  CreateMessageDto,
} from './communications.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { MessageCategory, Role } from '@prisma/client';

@Controller('education/communications')
export class CommunicationsController {
  constructor(private readonly commsService: CommunicationsService) {}

  @Get()
  findAll(
    @Query('category') category?: MessageCategory,
    @Query('target') target?: string,
  ) {
    return this.commsService.findAll({ category, target });
  }

  @Roles(Role.ADMINISTRATOR, Role.TEACHER)
  @Post()
  create(
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commsService.create(dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':id/pin')
  togglePin(@Param('id') id: string) {
    return this.commsService.togglePin(id);
  }

  @Roles(Role.ADMINISTRATOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.commsService.remove(id);
  }
}
