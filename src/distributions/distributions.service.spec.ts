import { Test, TestingModule } from '@nestjs/testing';
import { DistributionsService } from './distributions.service';

describe('DistributionsService', () => {
  let service: DistributionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DistributionsService],
    }).compile();

    service = module.get<DistributionsService>(DistributionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
