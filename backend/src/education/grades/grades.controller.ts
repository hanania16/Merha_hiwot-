import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
} from '@nestjs/common';
import {
  GradesService,
  SubmitGradeItemDto,
  BatchSubmitGradesDto,
} from './grades.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role, ClassLevel, AcademicSemester } from '@prisma/client';

@Controller('education/grades')
export class GradesController {
  constructor(private readonly gradesService: GradesService) {}

  @Get()
  getGrades(
    @Query('classLevel') classLevel?: ClassLevel,
    @Query('courseId') courseId?: string,
    @Query('ethiopianYear') ethiopianYear?: string,
    @Query('semester') semester?: AcademicSemester,
    @Query('studentId') studentId?: string,
  ) {
    return this.gradesService.getGrades({
      classLevel,
      courseId,
      ethiopianYear: ethiopianYear ? Number(ethiopianYear) : undefined,
      semester,
      studentId,
    });
  }

  @Roles(Role.ADMINISTRATOR, Role.TEACHER)
  @Post('submit')
  submitSingle(
    @Body() dto: SubmitGradeItemDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.gradesService.submitSingleGrade(dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR, Role.TEACHER)
  @Post('batch-submit')
  batchSubmit(
    @Body() dto: BatchSubmitGradesDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.gradesService.batchSubmitGrades(dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Post('approve')
  approveGrades(
    @Body('gradeIds') gradeIds: string[],
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.gradesService.approveGrades(gradeIds, user.userId);
  }

  @Get('report-card/:studentId')
  getReportCard(
    @Param('studentId') studentId: string,
    @Query('ethiopianYear') ethiopianYear?: string,
    @Query('semester') semester?: AcademicSemester,
  ) {
    return this.gradesService.getReportCard(
      studentId,
      ethiopianYear ? Number(ethiopianYear) : 2018,
      semester,
    );
  }
}
