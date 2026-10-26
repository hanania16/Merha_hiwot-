import { Module } from '@nestjs/common';
import { CoursesController } from './courses/courses.controller';
import { CoursesService } from './courses/courses.service';
import { GradesController } from './grades/grades.controller';
import { GradesService } from './grades/grades.service';
import { CommunicationsController } from './communications/communications.controller';
import { CommunicationsService } from './communications/communications.service';
import { CertificatesController } from './certificates/certificates.controller';
import { CertificatesService } from './certificates/certificates.service';
import { EducationDashboardController } from './dashboard/dashboard.controller';
import { EducationDashboardService } from './dashboard/dashboard.service';

@Module({
  controllers: [
    EducationDashboardController,
    CoursesController,
    GradesController,
    CommunicationsController,
    CertificatesController,
  ],
  providers: [
    EducationDashboardService,
    CoursesService,
    GradesService,
    CommunicationsService,
    CertificatesService,
  ],
  exports: [
    CoursesService,
    GradesService,
    CommunicationsService,
    CertificatesService,
  ],
})
export class EducationModule {}
