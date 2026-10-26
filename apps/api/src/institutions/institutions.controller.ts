import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { InstitutionsService } from './institutions.service';
import { CreateInstitutionDto, UpdateInstitutionDto } from './institutions.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleName } from '../_shared/enums/roles';

@Controller('institutions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InstitutionsController {
  constructor(private institutions: InstitutionsService) {}

  @Get()
  @Roles(RoleName.SUPER_ADMIN)
  findAll() {
    return this.institutions.findAll();
  }

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.INSTITUTION_ADMIN)
  findById(@Param('id') id: string) {
    return this.institutions.findById(id);
  }

  @Post()
  @Roles(RoleName.SUPER_ADMIN)
  create(@Body() dto: CreateInstitutionDto) {
    return this.institutions.create(dto);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateInstitutionDto) {
    return this.institutions.update(id, dto);
  }
}
