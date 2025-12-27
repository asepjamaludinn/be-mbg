import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Post()
  @ApiOperation({ summary: 'Buat User Baru (Admin/Kurir)' })
  create(@Body() createUserDto: CreateUserDto, @Request() req) {
    const adminId = req.user.id;
    return this.usersService.create(createUserDto, adminId);
  }

  @Roles(Role.ADMIN_PUSAT, Role.ADMIN_CABANG)
  @Get()
  @ApiOperation({ summary: 'List User', description: 'Filter by Role/Branch' })
  findAll(@Query() filter: UserFilterDto) {
    return this.usersService.findAll(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail User' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Patch(':id')
  @ApiOperation({ summary: 'Update User' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Delete(':id')
  @ApiOperation({ summary: 'Nonaktifkan User (Soft Delete)' })
  deactivate(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Roles(Role.ADMIN_PUSAT)
  @Post(':id/force-reset')
  @ApiOperation({ summary: 'Force Reset Password User Lain' })
  forceReset(@Param('id') id: string) {
    return this.usersService.forceResetPassword(id);
  }

  @Patch(':id/profile-picture')
  @ApiOperation({ summary: 'Update Foto Profil' })
  updateProfilePic(@Param('id') id: string, @Body('url') url: string) {
    return this.usersService.updateProfilePicture(id, url);
  }
}
