import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ClassGroupsService } from './class-groups.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('attendance/classes')
export class ClassGroupsController {
  constructor(private classGroupsService: ClassGroupsService) {}

  @Get()
  findAll() {
    return this.classGroupsService.findAllWithStats();
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Post(':classId/teachers/:teacherId')
  assignTeacher(@Param('classId') classId: string, @Param('teacherId') teacherId: string) {
    return this.classGroupsService.assignTeacher(classId, teacherId);
  }
}
