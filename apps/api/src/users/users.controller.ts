import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../_shared/types/jwt';
import { RoleName } from '../_shared/enums/roles';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
  findById(@Param('id') id: string) {
    return this.users.findById(id);
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  create(@Body() dto: CreateUserDto, @CurrentUser() currentUser: JwtPayload) {
    return this.users.create(dto, currentUser);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.users.update(id, dto, currentUser);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.users.remove(id);
  }
}
