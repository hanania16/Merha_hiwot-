import { Controller, Get, Post, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import * as fs from 'fs';

const UPLOAD_DIR = join(process.cwd(), 'assets', 'receipts');
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg']);

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function fileFilter(_req: any, file: Express.Multer.File, cb: (err: Error | null, accept: boolean) => void) {
  if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
  cb(new BadRequestException('Only PNG and JPG files are allowed'), false);
}

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/receipts-photos')
export class ReceiptsPhotosController {
  constructor(private prisma: PrismaService) {}

  @Get()
  findAll() {
    return this.prisma.receiptPhoto.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
          cb(null, unique);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter,
    }),
  )
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body('note') note?: string,
  ) {
    if (!file) throw new BadRequestException('Photo file is required');
    return this.prisma.receiptPhoto.create({
      data: { filename: file.filename, note: note || null },
    });
  }
}
