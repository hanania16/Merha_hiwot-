import { Module } from '@nestjs/common';
import { ClassGroupsService } from './class-groups.service';
import { ClassGroupsController } from './class-groups.controller';

@Module({
  providers: [ClassGroupsService],
  controllers: [ClassGroupsController],
  exports: [ClassGroupsService],
})
export class ClassGroupsModule {}
