import { Module } from '@nestjs/common';
import { WeeklyDigestService } from './digest.service';
import { DigestController } from './digest.controller';
import { StudentFeesModule } from '../../finance/student-fees/student-fees.module';

@Module({
  imports: [StudentFeesModule],
  providers: [WeeklyDigestService],
  controllers: [DigestController],
})
export class DigestModule {}
