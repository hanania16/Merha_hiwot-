import { Body, Controller, Get, Post } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('attendance/teachers')
export class TeachersController {
  constructor(private teachersService: TeachersService) {}

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() body: { fullName: string; phone?: string }) {
    return this.teachersService.create(body);
  }
}
