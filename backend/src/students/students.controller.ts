import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { QueryStudentDto } from './dto/query-student.dto';
import {
  CreateBehaviorRecordDto,
  ToggleSuspensionDto,
  UpdateBehaviorStatusDto,
} from './dto/behavior-student.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Role, StudentStatus } from '@prisma/client';

import {
  CreateClassDto,
  UpdateClassDto,
  BulkCreateStudentsDto,
} from './dto/class.dto';

@Controller('students')
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  // Read access: any authenticated role
  @Get()
  findAll(@Query() query: QueryStudentDto) {
    return this.studentsService.findAll(query);
  }

  // --------------------------------------------------------------------------
  // CLASS MANAGEMENT ROUTES
  // --------------------------------------------------------------------------

  @Get('classes')
  findClasses(@Query('includeInactive') includeInactive?: string) {
    return this.studentsService.findClasses(includeInactive === 'true');
  }

  @Get('classes/:id')
  findClassById(@Param('id') id: string) {
    return this.studentsService.findClassById(id);
  }

  @Roles(Role.ADMINISTRATOR)
  @Post('classes')
  createClass(
    @Body() dto: CreateClassDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.studentsService.createClass(dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch('classes/:id')
  updateClass(
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.studentsService.updateClass(id, dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Delete('classes/:id')
  deleteClass(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.studentsService.deleteClass(id, user.userId);
  }

  // --------------------------------------------------------------------------
  // BULK STUDENT REGISTRATION
  // --------------------------------------------------------------------------

  @Roles(Role.ADMINISTRATOR)
  @Post('bulk')
  bulkCreate(
    @Body() dto: BulkCreateStudentsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.studentsService.bulkCreate(dto, user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  // Write access: Administrator and Finance Officer
  @Roles(Role.ADMINISTRATOR, Role.FINANCE_OFFICER)
  @Post()
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.studentsService.create(dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: CurrentUserPayload) {
    return this.studentsService.update(id, dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':id/status')
  setStatus(
    @Param('id') id: string,
    @Body('status') status: StudentStatus,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.studentsService.setStatus(id, status, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.studentsService.remove(id, user.userId);
  }

  // --------------------------------------------------------------------------
  // BEHAVIOR & DISCIPLINE ROUTES
  // --------------------------------------------------------------------------

  @Get(':id/behavior')
  getBehaviorRecords(@Param('id') id: string) {
    return this.studentsService.getBehaviorRecords(id);
  }

  @Roles(Role.ADMINISTRATOR, Role.TEACHER)
  @Post(':id/behavior')
  addBehaviorRecord(
    @Param('id') id: string,
    @Body() dto: CreateBehaviorRecordDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.studentsService.addBehaviorRecord(id, dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Post(':id/suspension')
  toggleSuspension(
    @Param('id') id: string,
    @Body() dto: ToggleSuspensionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.studentsService.toggleSuspension(id, dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR, Role.TEACHER)
  @Patch(':id/behavior-status')
  updateBehaviorStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBehaviorStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.studentsService.updateBehaviorStatus(id, dto, user.userId);
  }
}
