import { Controller, Post } from '@nestjs/common';
import { WeeklyDigestService } from './digest.service';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('digest')
export class DigestController {
  constructor(private digestService: WeeklyDigestService) {}

  /** Lets an Administrator preview the Saturday digest on demand instead of waiting for the cron. */
  @Roles(Role.ADMINISTRATOR)
  @Post('run-now')
  runNow() {
    return this.digestService.runNow();
  }
}
