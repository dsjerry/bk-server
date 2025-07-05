import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return '行到水穷处，坐看云起时。<br /> 访问 /api-doc 查看文档';
  }
}
