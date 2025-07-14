import { Controller, Get, Param, Patch, NotFoundException, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { instanceToPlain } from 'class-transformer';
import { UserService } from './user.service';
import { User } from 'src/entity';
import { JwtGuard } from 'src/guard/jwt.guard';
import { UserUpdateDto } from 'src/dto/user.dto';
import { PaginationDto } from 'src/dto/pagination.dto';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  @ApiOperation({ summary: "获取所有用户" })
  @ApiOkResponse({
    description: '获取所有用户',
    type: [User],
  })
  @UseGuards(JwtGuard)
  getUsers(@Query() paginationDto: PaginationDto) {
    return this.userService.getUsers(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: "获取用户详情" })
  @ApiOkResponse({
    description: '获取用户详情',
    type: User,
  })
  @UseGuards(JwtGuard)
  async getUserById(@Param('id') id: number) {
    const user = await this.userService.findOneById(id);
    if (!user) throw new NotFoundException('用户不存在');
    const { password, ...toBeReturned } = user;
    return toBeReturned;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: "更新用户" })
  @ApiOkResponse({
    description: '更新用户',
    type: User,
  })
  async updateUser(@Param('id') id: number, @Body() userDto: UserUpdateDto) {
    const user = await this.userService.updateUser(id, userDto);

    return instanceToPlain(user);
  }

  @Get('username/:name')
  @ApiOperation({ summary: "根据用户名查询用户" })
  @ApiOkResponse({
    description: '返回用户id',
    type: Number,
  })
  async getUserByName(@Param('name') name: string) {
    const user = await this.userService.findOne(name);
    return {
      id: user?.id,
    };
  }
}
