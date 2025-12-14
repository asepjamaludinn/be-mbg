import { Test, TestingModule } from '@nestjs/testing';
import { DistributionsController } from './distributions.controller';
import { DistributionsService } from './distributions.service';

describe('DistributionsController', () => {
  let controller: DistributionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DistributionsController],
      providers: [DistributionsService],
    }).compile();

    controller = module.get<DistributionsController>(DistributionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
