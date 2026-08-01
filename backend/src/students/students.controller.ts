import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  // Read access: any authenticated role (Finance reads the roster read-only)
  @Get()
  findAll(@Query() query: QueryStudentDto) {
    return this.studentsService.findAll(query);
  }

  @Get('classes')
  findClasses() {
    return this.studentsService.findClasses();
  }

  @Get('inactive')
  findInactive() {
    return this.studentsService.findInactiveStudents();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  // Write access: Attendance Officer / Administrator only — Finance never creates students
  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Post()
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.studentsService.create(dto, user.userId);
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.studentsService.update(id, dto, user.userId);
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body('status') status: 'ACTIVE' | 'INACTIVE',
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.studentsService.setStatus(id, status, user.userId);
  }

  @Roles(Role.ATTENDANCE_OFFICER, Role.ADMINISTRATOR)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.studentsService.remove(id, user.userId);
  }
}
