import { Test, TestingModule } from '@nestjs/testing';
import { KeepingService } from './keeping.service';

describe('KeepingService', () => {
  let service: KeepingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KeepingService],
    }).compile();

    service = module.get<KeepingService>(KeepingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
