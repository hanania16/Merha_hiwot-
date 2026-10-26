import { Controller, Get, Patch, Body } from '@nestjs/common';
import { SettingsService, UpdateSettingsDto } from './settings.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Public()
  @Get()
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch()
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
