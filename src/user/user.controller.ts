import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from '../entity/user.entity';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('list')
  @ApiOkResponse({
    description: '获取所有用户',
    type: [User],
  })
  getUsers() {
    return this.userService.getUsers();
  }

  @Get('detail')
  @ApiOkResponse({
    description: '获取用户详情',
    type: User,
  })
  getUserById(@Query('id') id: number) {
    return this.userService.findOneById(id);
  }
}
