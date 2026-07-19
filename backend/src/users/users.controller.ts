import { Controller, Get } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Roles(Role.ADMINISTRATOR)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
