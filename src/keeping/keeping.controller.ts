import { Controller, Get, Query, Post, Body, UseGuards, Req } from '@nestjs/common';
import { KeepingService } from './keeping.service';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Keeping } from '../entity/keeping.entity';
import { KeepingCreateDto, KeepingUpdateDto } from '../dto/keeping.dto';
import { JwtGuard } from 'src/guard/jwt.guard';

@ApiTags('记账')
@Controller('keeping')
export class KeepingController {
  constructor(private readonly keepingService: KeepingService) { }

  @Get('list')
  @ApiOkResponse({
    description: '获取所有记账',
    type: [Keeping],
  })
  getKeepings() {
    return this.keepingService.findAll();
  }

  @Get('detail')
  @ApiOkResponse({
    description: '获取记账详情',
    type: Keeping,
  })
  getKeepingById(@Query('id') id: number) {
    return this.keepingService.findOne(id);
  }

  @Post('create')
  @UseGuards(JwtGuard)
  @ApiOkResponse({
    description: '添加记账',
    type: Keeping,
  })
  addKeeping(@Body() keepingDto: KeepingCreateDto, @Req() req: any) {
    const userId = req.user.userId as number;
    return this.keepingService.create(keepingDto, userId);
  }

  @Post('update')
  @ApiOkResponse({
    description: '更新记账',
    type: Keeping,
  })
  updateKeeping(@Body() keepingDto: KeepingUpdateDto) {
    return this.keepingService.update(keepingDto);
  }
}
