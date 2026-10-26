import { Test, TestingModule } from '@nestjs/testing';
import { BehaviorController } from './behavior.controller';
import { BehaviorService } from './behavior.service';
import { ResolveBehaviorDto, IngestBehaviorDto } from './behavior.dto';

describe('BehaviorController', () => {
  let controller: BehaviorController;
  let service: {
    ingest: jest.Mock;
    resolve: jest.Mock;
    getAlerts: jest.Mock;
    acknowledgeAlert: jest.Mock;
    dismissAlert: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      ingest: jest.fn(),
      resolve: jest.fn(),
      getAlerts: jest.fn(),
      acknowledgeAlert: jest.fn(),
      dismissAlert: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BehaviorController],
      providers: [
        {
          provide: BehaviorService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<BehaviorController>(BehaviorController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('resolve', () => {
    it('delegates resolution request to BehaviorService.resolve', async () => {
      const dto: ResolveBehaviorDto = {
        eventId: 'bev_test_123',
        eventType: 'PHONE_USAGE',
        trackId: 'track_5',
        duration: 10.2,
        status: 'RESOLVED',
        metadata: { resolution: 'evidence_cleared' },
      };

      const expectedResponse = {
        success: true,
        resolved: true,
        eventId: 'bev_test_123',
      };

      service.resolve.mockResolvedValue(expectedResponse);

      const result = await controller.resolve(dto);

      expect(service.resolve).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResponse);
    });

    it('handles idempotent resolution of already-resolved episode through service', async () => {
      const dto: ResolveBehaviorDto = {
        eventId: 'bev_test_123',
      };

      service.resolve.mockResolvedValue({
        success: true,
        resolved: true,
        alreadyResolved: true,
        eventId: 'bev_test_123',
      });

      const result = await controller.resolve(dto);

      expect(result.alreadyResolved).toBe(true);
    });
  });

  describe('ingest', () => {
    it('delegates ingest request to BehaviorService.ingest', async () => {
      const dto: IngestBehaviorDto = {
        behaviorType: 'PHONE_USAGE',
        confidence: 0.95,
        duration: 5.0,
      };

      service.ingest.mockResolvedValue({ event: { id: 'evt-1' } });

      const result = await controller.ingest(dto);

      expect(service.ingest).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ event: { id: 'evt-1' } });
    });
  });
});
