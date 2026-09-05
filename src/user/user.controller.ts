import {
  Controller,
  Get,
  Param,
  Patch,
  NotFoundException,
  ForbiddenException,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtGuard } from 'src/guard/jwt.guard';
import { UserUpdateDto } from 'src/dto/user.dto';
import { UserResponseDto, toUserResponse } from 'src/dto/user-response.dto';
import { PaginationDto } from 'src/dto/pagination.dto';
import { ReqUser } from 'src/decorator';

/**
 * 出参一律走 UserResponseDto（toUserResponse 白名单映射）。
 * 之前直接返回 User 实体，password 哈希会原样泄露给调用方。
 */
@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '获取所有用户' })
  @ApiOkResponse({
    description: '获取所有用户',
    type: [UserResponseDto],
  })
  @UseGuards(JwtGuard)
  async getUsers(@Query() paginationDto: PaginationDto) {
    const { items, meta } = await this.userService.getUsers(paginationDto);
    return { items: items.map(toUserResponse), meta };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  @ApiOkResponse({
    description: '获取用户详情',
    type: UserResponseDto,
  })
  @UseGuards(JwtGuard)
  async getUserById(@Param('id') id: number) {
    const user = await this.userService.findOneById(id);
    if (!user) throw new NotFoundException('用户不存在');
    return toUserResponse(user);
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @ApiOperation({ summary: '更新用户' })
  @ApiOkResponse({
    description: '更新用户',
    type: UserResponseDto,
  })
  async updateUser(@Param('id') id: number, @Body() userDto: UserUpdateDto, @ReqUser() user: BKS.ReqUser) {
    // 只能修改自己的资料（此前任何登录用户可改任意用户，属于越权）
    if (id !== user.userId) {
      throw new ForbiddenException('只能修改自己的资料');
    }
    const updated = await this.userService.updateUser(id, userDto);
    if (!updated) throw new NotFoundException('用户不存在');
    return toUserResponse(updated);
  }

  @Get('username/:name')
  @ApiOperation({ summary: '根据用户名查询用户' })
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
