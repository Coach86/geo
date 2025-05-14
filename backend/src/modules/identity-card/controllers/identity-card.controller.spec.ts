import { Test, TestingModule } from '@nestjs/testing';
import { IdentityCardController } from './identity-card.controller';
import { IdentityCardService } from '../services/identity-card.service';
import { CreateIdentityCardDto } from '../dto/create-identity-card.dto';
import { NotFoundException } from '@nestjs/common';

describe('IdentityCardController', () => {
  let controller: IdentityCardController;
  let service: IdentityCardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdentityCardController],
      providers: [
        {
          provide: IdentityCardService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<IdentityCardController>(IdentityCardController);
    service = module.get<IdentityCardService>(IdentityCardService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create and return an identity card', async () => {
      const createDto: CreateIdentityCardDto = {
        url: 'https://example.com',
      };

      const mockIdentityCard = {
        companyId: 'test-id',
        brandName: 'Test Company',
        website: 'https://example.com',
        industry: 'Technology',
        shortDescription: 'A test company',
        fullDescription: 'A detailed description of the test company',
        keyFeatures: ['Feature 1', 'Feature 2'],
        competitors: ['Competitor 1', 'Competitor 2'],
        updatedAt: new Date(),
      };

      (service.create as jest.Mock).mockResolvedValue(mockIdentityCard);

      const result = await controller.create(createDto);

      expect(service.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockIdentityCard);
    });
  });

  describe('findById', () => {
    it('should return an identity card by id', async () => {
      const companyId = 'test-id';
      const mockIdentityCard = {
        companyId,
        brandName: 'Test Company',
        website: 'https://example.com',
        industry: 'Technology',
        shortDescription: 'A test company',
        fullDescription: 'A detailed description of the test company',
        keyFeatures: ['Feature 1', 'Feature 2'],
        competitors: ['Competitor 1', 'Competitor 2'],
        updatedAt: new Date(),
      };

      (service.findById as jest.Mock).mockResolvedValue(mockIdentityCard);

      const result = await controller.findById(companyId);

      expect(service.findById).toHaveBeenCalledWith(companyId);
      expect(result).toEqual(mockIdentityCard);
    });

    it('should throw NotFoundException if identity card not found', async () => {
      const companyId = 'not-found';
      
      (service.findById as jest.Mock).mockRejectedValue(new NotFoundException());

      await expect(controller.findById(companyId)).rejects.toThrow(NotFoundException);
    });
  });
});