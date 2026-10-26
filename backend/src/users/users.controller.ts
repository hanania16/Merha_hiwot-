import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(Role.ADMINISTRATOR, Role.TEACHER)
  @Get()
  findAll(@Query('role') role?: Role) {
    return this.usersService.findAll(role);
  }

  @Roles(Role.ADMINISTRATOR)
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Roles(Role.ADMINISTRATOR)
  @Post()
  create(@Body() body: { fullName: string; email: string; password?: string; role: Role; isActive?: boolean }) {
    return this.usersService.create(body);
  }

  @Roles(Role.ADMINISTRATOR)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { fullName?: string; email?: string; role?: Role; isActive?: boolean; password?: string },
  ) {
    return this.usersService.update(id, body);
  }

  @Roles(Role.ADMINISTRATOR)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
