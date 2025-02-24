import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('show return users', () => {
    expect(service.getUsers()).toEqual([
      { id: 1, name: '小明', age: 18, passwd: '123' },
      { id: 2, name: '小白', age: 19, passwd: '123' }
    ])
  })
});
