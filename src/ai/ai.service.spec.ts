import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'DEEPSEEK_API_KEY') return 'test-key';
      if (key === 'DEEPSEEK_BASE_URL') return 'https://mock.deepseek';
      if (key === 'DEEPSEEK_MODEL') return 'test-model';
      return undefined;
    }),
  };

  beforeEach(() => {
    service = new AiService(configService as unknown as ConfigService);
    jest.restoreAllMocks();
  });

  it('未配置 API key 时抛 503（密钥只在服务端）', () => {
    const noKey = new AiService({ get: () => undefined } as unknown as ConfigService);
    return expect(noKey.chatJson({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('chatJson 透传模型与消息，返回上游 JSON', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), { status: 200 }));

    const result = await service.chatJson({ messages: [{ role: 'user', content: 'hi' }] });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://mock.deepseek/chat/completions');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');
    expect(init.body).toEqual(expect.stringContaining('"model":"test-model"'));
    expect(init.body).toEqual(expect.stringContaining('"stream":false'));
    const typed = result as { choices: { message: { content: string } }[] };
    expect(typed.choices[0].message.content).toBe('ok');
  });

  it('categorize 只返回候选列表内的分类，非法输出归为 null', async () => {
    const upstream = new Response(JSON.stringify({ choices: [{ message: { content: '{"tag":"food"}' } }] }), {
      status: 200,
    });
    jest.spyOn(global, 'fetch').mockResolvedValue(upstream);
    const result = await service.categorize({ name: '午饭', candidates: ['food', 'shop'] });
    expect(result.tag).toBe('food');
  });

  it('上游错误时抛 BadGateway 并透传原因', async () => {
    const upstream = new Response(JSON.stringify({ error: { message: 'quota exceeded' } }), { status: 402 });
    jest.spyOn(global, 'fetch').mockResolvedValue(upstream);
    await expect(service.chatJson({ messages: [{ role: 'user', content: 'hi' }] })).rejects.toThrow(
      new BadGatewayException('AI 上游错误: quota exceeded'),
    );
  });
});
