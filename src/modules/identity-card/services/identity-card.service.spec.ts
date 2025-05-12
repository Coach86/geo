import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IdentityCardService } from './identity-card.service';
import { PrismaService } from '../../../services/prisma.service';
import { CreateIdentityCardDto } from '../dto/create-identity-card.dto';
import { NotFoundException } from '@nestjs/common';

// Mock the fetchAndScrape function
jest.mock('../../../utils/url-scraper', () => ({
  fetchAndScrape: jest.fn().mockResolvedValue({
    title: 'Test Company',
    description: 'A test company description',
    keywords: ['software', 'technology', 'test'],
    content: 'This is test content for the company website.',
    url: 'https://test-company.example.com',
  }),
}));

describe('IdentityCardService', () => {
  let service: IdentityCardService;
  let prismaService: PrismaService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityCardService,
        {
          provide: PrismaService,
          useValue: {
            identityCard: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IdentityCardService>(IdentityCardService);
    prismaService = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an identity card from URL', async () => {
      const createDto: CreateIdentityCardDto = {
        url: 'https://test-company.example.com',
      };

      const mockCreatedCard = {
        id: 'test-uuid',
        brandName: 'Test Company',
        website: 'https://test-company.example.com',
        industry: 'Software',
        shortDescription: 'A test company description',
        fullDescription: 'Test Company is a company operating in the technology sector. A test company description Based on their website, they appear to offer various products and services to their customers. The website was found at https://test-company.example.com.',
        keyFeatures: ['Product or service offering', 'Customer support', 'Online presence', 'Business solutions'],
        competitors: ['Competitor One', 'Competitor Two', 'Competitor Three'],
        updatedAt: new Date(),
        data: {},
      };

      (prismaService.identityCard.create as jest.Mock).mockResolvedValue(mockCreatedCard);

      const result = await service.create(createDto);

      expect(prismaService.identityCard.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'company.created',
        expect.objectContaining({ companyId: 'test-uuid' }),
      );
      expect(result).toEqual({
        companyId: 'test-uuid',
        brandName: 'Test Company',
        website: 'https://test-company.example.com',
        industry: 'Software',
        shortDescription: 'A test company description',
        fullDescription: expect.any(String),
        keyFeatures: expect.any(Array),
        competitors: expect.any(Array),
        updatedAt: expect.any(Date),
      });
    });

    it('should create an identity card from data', async () => {
      const createDto: CreateIdentityCardDto = {
        data: {
          brandName: 'Data Company',
          website: 'https://data-company.example.com',
          industry: 'Technology',
          shortDescription: 'A data-provided company',
          fullDescription: 'A full description from data',
          keyFeatures: ['Feature 1', 'Feature 2'],
          competitors: ['Competitor A', 'Competitor B'],
        },
      };

      const mockCreatedCard = {
        id: 'data-uuid',
        brandName: 'Data Company',
        website: 'https://data-company.example.com',
        industry: 'Technology',
        shortDescription: 'A data-provided company',
        fullDescription: 'A full description from data',
        keyFeatures: ['Feature 1', 'Feature 2'],
        competitors: ['Competitor A', 'Competitor B'],
        updatedAt: new Date(),
        data: {},
      };

      (prismaService.identityCard.create as jest.Mock).mockResolvedValue(mockCreatedCard);

      const result = await service.create(createDto);

      expect(prismaService.identityCard.create).toHaveBeenCalled();
      expect(result.brandName).toBe('Data Company');
    });
  });

  describe('findById', () => {
    it('should find and return an identity card by id', async () => {
      const mockCard = {
        id: 'test-uuid',
        brandName: 'Test Company',
        website: 'https://test-company.example.com',
        industry: 'Software',
        shortDescription: 'A test company description',
        fullDescription: 'A full description',
        keyFeatures: ['Feature 1', 'Feature 2'],
        competitors: ['Competitor 1', 'Competitor 2'],
        updatedAt: new Date(),
        data: {},
      };

      (prismaService.identityCard.findUnique as jest.Mock).mockResolvedValue(mockCard);

      const result = await service.findById('test-uuid');

      expect(prismaService.identityCard.findUnique).toHaveBeenCalledWith({
        where: { id: 'test-uuid' },
      });
      expect(result.companyId).toBe('test-uuid');
    });

    it('should throw NotFoundException if identity card not found', async () => {
      (prismaService.identityCard.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('not-found')).rejects.toThrow(NotFoundException);
    });
  });
});