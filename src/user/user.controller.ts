import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiParam } from '@nestjs/swagger'
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Roles } from 'src/auth/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { User } from './entities/user.entity';

@ApiTags('users')
@Controller('user')
@UseGuards(RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  @ApiOkResponse({
    description: '获取所有用户',
    type: [User]
  })
  getUsers() {
    return this.userService.getUsers()
  }

  @Post()
  @ApiOkResponse({
    description: '创建用户',
    type: User
  })
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.userService.createUser(createUserDto)
  }

  @Get('admin')
  @Roles('admin')
  @ApiOkResponse({
    description: '获取管理员数据',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Admin Data'
        }
      }
    }
  })
  getAdminData() {
    return { message: 'Admin Data' }
  }
}
