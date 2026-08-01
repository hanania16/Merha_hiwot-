import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@Roles(Role.FINANCE_OFFICER, Role.ADMINISTRATOR)
@Controller('finance/accounts')
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAccountDto, @CurrentUser() user: CurrentUserPayload) {
    return this.accountsService.create(dto, user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto, @CurrentUser() user: CurrentUserPayload) {
    return this.accountsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.accountsService.remove(id, user.userId);
  }
}
