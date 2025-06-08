import { Test, TestingModule } from '@nestjs/testing';
import { KeepingController } from './keeping.controller';
import { KeepingService } from './keeping.service';

describe('KeepingController', () => {
  let controller: KeepingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KeepingController],
      providers: [KeepingService],
    }).compile();

    controller = module.get<KeepingController>(KeepingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
