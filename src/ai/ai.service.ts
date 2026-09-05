import { BadGatewayException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiCategorizeDto, AiChatDto } from './dto/ai.dto';

/**
 * AI 代理服务：客户端不再持有 DeepSeek API Key（此前明文存在手机存储里），
 * 统一由服务端持有密钥并转发请求。
 * 服务端只做密钥管理和转发，不落任何对话/账单内容日志（隐私数据不进日志）。
 */
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly defaultModel: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    this.baseUrl = (this.configService.get<string>('DEEPSEEK_BASE_URL') || 'https://api.deepseek.com').replace(
      /\/+$/,
      '',
    );
    this.defaultModel = this.configService.get<string>('DEEPSEEK_MODEL') || 'deepseek-chat';
  }

  private assertConfigured() {
    if (!this.apiKey) {
      throw new ServiceUnavailableException('AI 服务未配置（服务端缺少 DEEPSEEK_API_KEY）');
    }
  }

  private headers() {
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` };
  }

  /** 非流式对话：返回上游 JSON 原文（由全局拦截器统一包装后给客户端） */
  async chatJson(dto: AiChatDto): Promise<Record<string, any>> {
    this.assertConfigured();
    const upstream = await this.request({
      model: dto.model || this.defaultModel,
      messages: dto.messages,
      stream: false,
    });
    return (await upstream.json()) as Record<string, any>;
  }

  /** 流式对话：返回上游 Response（SSE 流由 Controller 直接 pipe 给客户端） */
  async chatStream(dto: AiChatDto): Promise<Response> {
    this.assertConfigured();
    return this.request({
      model: dto.model || this.defaultModel,
      messages: dto.messages,
      stream: true,
    });
  }

  /**
   * AI 自动分类：把记账归入候选分类之一。
   * 候选由客户端传入（内置 + 自定义 tag 别名），返回命中别名或 null（拿不准就不猜）
   */
  async categorize(dto: AiCategorizeDto): Promise<{ tag: string | null }> {
    this.assertConfigured();
    const prompt = [
      '你是记账分类助手。把下面这条记账归入最合适的分类，必须从候选列表中选一个并原样返回。',
      `记账名称：${dto.name}`,
      `备注：${dto.remark || '无'}`,
      `候选分类：${dto.candidates.join('、')}`,
      '只返回 JSON：{"tag":"<候选分类之一>"}，不要输出其他内容。',
    ].join('\n');

    const upstream = await this.request({
      model: this.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      response_format: { type: 'json_object' },
    });
    if (!upstream.ok) {
      throw new BadGatewayException('AI 服务暂时不可用');
    }
    const data = (await upstream.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    try {
      const parsed = JSON.parse(content) as { tag?: string };
      const tag = dto.candidates.find((c) => c === parsed.tag) ?? null;
      return { tag };
    } catch {
      this.logger.warn('AI 分类返回了非 JSON 内容');
      return { tag: null };
    }
  }

  private async request(body: Record<string, unknown>): Promise<Response> {
    const upstream = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      // 30s 超时：LLM 偶发挂起时快速失败，避免请求堆积
      signal: AbortSignal.timeout(30_000),
    });
    if (!upstream.ok) {
      // 上游错误信息透传给客户端（不含密钥），便于排查模型/配额问题
      let message = 'AI 上游服务错误';
      try {
        const err = (await upstream.json()) as { error?: { message?: string } };
        message = err?.error?.message || message;
      } catch {
        // 保留默认 message
      }
      throw new BadGatewayException(`AI 上游错误: ${message}`);
    }
    return upstream;
  }
}
