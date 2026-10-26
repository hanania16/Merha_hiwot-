import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import {
  CertificatesService,
  GenerateCertificateDto,
} from './certificates.service';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('education/certificates')
export class CertificatesController {
  constructor(private readonly certsService: CertificatesService) {}

  @Get()
  findAll() {
    return this.certsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.certsService.findOne(id);
  }

  @Roles(Role.ADMINISTRATOR)
  @Post('generate')
  generate(
    @Body() dto: GenerateCertificateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.certsService.generate(dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Post('generate-class')
  generateClass(
    @Body() dto: any,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.certsService.generateClassCertificates(dto, user.userId);
  }

  @Roles(Role.ADMINISTRATOR)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.certsService.remove(id);
  }
}
