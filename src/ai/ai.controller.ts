import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { Readable } from 'stream';
import { AiService } from './ai.service';
import { AiChatDto, AiCategorizeDto } from './dto/ai.dto';
import { JwtGuard } from 'src/guard/jwt.guard';
import { ReqUser } from 'src/decorator';

/**
 * AI 代理端点：密钥在服务端，客户端只需带 JWT。
 * chat 支持流式（SSE 直通）与非流式两种模式；categorize 用于自动分类。
 */
@ApiTags('AI')
@UseGuards(JwtGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // LLM 成本高，比全局默认收紧
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('chat')
  @ApiOperation({ summary: 'AI 对话代理（stream=true 时 SSE 直通上游）' })
  async chat(@Body() dto: AiChatDto, @ReqUser() _user: BKS.ReqUser, @Res() res: Response) {
    if (dto.stream) {
      const upstream = await this.aiService.chatStream(dto);
      // SSE 直通：透传上游的事件流（非 passthrough 的 @Res 由框架认为已处理，不会再包响应体）
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();
      Readable.fromWeb(upstream.body as import('stream/web').ReadableStream).pipe(res);
      return;
    }
    // 非流式：直接返回上游 JSON，走全局 ResponseInterceptor 统一包装
    return this.aiService.chatJson(dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('categorize')
  @ApiOperation({ summary: 'AI 自动分类：返回命中的候选分类别名' })
  categorize(@Body() dto: AiCategorizeDto, @ReqUser() _user: BKS.ReqUser) {
    return this.aiService.categorize(dto);
  }
}
