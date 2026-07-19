import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsPhotosController } from './receipts-photos.controller';

@Module({
  imports: [MulterModule.register()],
  providers: [ReceiptsService],
  controllers: [ReceiptsController, ReceiptsPhotosController],
})
export class ReceiptsModule {}
