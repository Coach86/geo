import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException, NotFoundException } from '@nestjs/common';
import { BrandReportService } from './brand-report.service';
import { BrandReport } from '../schemas/brand-report.schema';
import { ProjectService } from '../../project/services/project.service';
import { UserService } from '../../user/services/user.service';
import { BrandReportQueryService } from './brand-report-query.service';
import { BrandReportMapperService } from './brand-report-mapper.service';
import { BrandReportCitationExtractorService } from './brand-report-citation-extractor.service';
import { BrandReportVariationCalculatorService } from './brand-report-variation-calculator.service';
import { BrandReportVisibilityAggregationService } from './brand-report-visibility-aggregation.service';
import { BrandReportAlignmentAggregationService } from './brand-report-alignment-aggregation.service';
import { BrandReportSentimentAggregationService } from './brand-report-sentiment-aggregation.service';
import { BrandReportCompetitionAggregationService } from './brand-report-competition-aggregation.service';
import { BrandReportExplorerAggregationService } from './brand-report-explorer-aggregation.service';

describe('BrandReportService - Organization Access Control', () => {
  let service: BrandReportService;
  let brandReportModel: any;
  let projectService: ProjectService;
  let userService: UserService;

  const mockUser = {
    id: 'user123',
    organizationId: 'org123',
    email: 'user@test.com',
  };

  const mockUserDifferentOrg = {
    id: 'user456',
    organizationId: 'org456',
    email: 'user2@test.com',
  };

  const mockProject = {
    id: 'project123',
    organizationId: 'org123',
    name: 'Test Project',
  };

  const mockProjectDifferentOrg = {
    id: 'project456',
    organizationId: 'org456',
    name: 'Other Org Project',
  };

  const mockReport = {
    id: 'report123',
    projectId: 'project123',
    batchExecutionId: 'batch123',
  };

  const mockReportDifferentOrg = {
    id: 'report456',
    projectId: 'project456',
    batchExecutionId: 'batch456',
  };

  beforeEach(async () => {
    const mockBrandReportModel = {
      findOne: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandReportService,
        {
          provide: getModelToken(BrandReport.name),
          useValue: mockBrandReportModel,
        },
        {
          provide: ProjectService,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: BrandReportQueryService,
          useValue: {
            getProjectReports: jest.fn(),
            getReport: jest.fn(),
            getExplorerData: jest.fn(),
            getVisibilityData: jest.fn(),
            getSentimentData: jest.fn(),
            getAlignmentData: jest.fn(),
          },
        },
        {
          provide: BrandReportMapperService,
          useValue: {},
        },
        {
          provide: BrandReportCitationExtractorService,
          useValue: {
            extractCitationsFromCompetition: jest.fn(),
          },
        },
        {
          provide: BrandReportVariationCalculatorService,
          useValue: {},
        },
        {
          provide: BrandReportVisibilityAggregationService,
          useValue: {
            getAggregatedVisibility: jest.fn(),
          },
        },
        {
          provide: BrandReportAlignmentAggregationService,
          useValue: {
            getAggregatedAlignment: jest.fn(),
          },
        },
        {
          provide: BrandReportSentimentAggregationService,
          useValue: {
            getAggregatedSentiment: jest.fn(),
          },
        },
        {
          provide: BrandReportCompetitionAggregationService,
          useValue: {
            getAggregatedCompetition: jest.fn(),
          },
        },
        {
          provide: BrandReportExplorerAggregationService,
          useValue: {
            getAggregatedExplorer: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<BrandReportService>(BrandReportService);
    brandReportModel = module.get(getModelToken(BrandReport.name));
    projectService = module.get<ProjectService>(ProjectService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProjectAccess', () => {
    it('should allow access when user belongs to the same organization as the project', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(projectService, 'findById').mockResolvedValue(mockProject as any);

      await expect(
        service['validateProjectAccess']('project123', 'user123')
      ).resolves.not.toThrow();
    });

    it('should throw UnauthorizedException when user not found', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(null);

      await expect(
        service['validateProjectAccess']('project123', 'user123')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException when project not found', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(projectService, 'findById').mockResolvedValue(null);

      await expect(
        service['validateProjectAccess']('project123', 'user123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when user belongs to different organization', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockUserDifferentOrg as any);
      jest.spyOn(projectService, 'findById').mockResolvedValue(mockProject as any);

      await expect(
        service['validateProjectAccess']('project123', 'user456')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateReportAccess', () => {
    it('should allow access when user has access to the project', async () => {
      brandReportModel.lean.mockResolvedValue(mockReport);
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(projectService, 'findById').mockResolvedValue(mockProject as any);

      const result = await service.validateReportAccess('report123', 'user123');
      expect(result).toEqual(mockReport);
    });

    it('should throw NotFoundException when report not found', async () => {
      brandReportModel.lean.mockResolvedValue(null);

      await expect(
        service.validateReportAccess('report123', 'user123')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException when user cannot access the project', async () => {
      brandReportModel.lean.mockResolvedValue(mockReportDifferentOrg);
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(projectService, 'findById').mockResolvedValue(mockProjectDifferentOrg as any);

      await expect(
        service.validateReportAccess('report456', 'user123')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProjectReports', () => {
    it('should validate access when userId is provided', async () => {
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(projectService, 'findById').mockResolvedValue(mockProject as any);
      jest.spyOn(service['queryService'], 'getProjectReports').mockResolvedValue([]);

      await service.getProjectReports('project123', 10, 'user123');

      expect(userService.findOne).toHaveBeenCalledWith('user123');
      expect(projectService.findById).toHaveBeenCalledWith('project123');
    });

    it('should not validate access when userId is not provided', async () => {
      jest.spyOn(service['queryService'], 'getProjectReports').mockResolvedValue([]);

      await service.getProjectReports('project123', 10);

      expect(userService.findOne).not.toHaveBeenCalled();
      expect(projectService.findById).not.toHaveBeenCalled();
    });
  });

  describe('getReport', () => {
    it('should validate access when userId is provided', async () => {
      brandReportModel.lean.mockResolvedValue(mockReport);
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(projectService, 'findById').mockResolvedValue(mockProject as any);
      jest.spyOn(service['queryService'], 'getReport').mockResolvedValue({} as any);

      await service.getReport('report123', 'user123');

      expect(brandReportModel.findOne).toHaveBeenCalledWith({ id: 'report123' });
      expect(userService.findOne).toHaveBeenCalledWith('user123');
      expect(projectService.findById).toHaveBeenCalledWith('project123');
    });

    it('should throw when user tries to access report from different organization', async () => {
      brandReportModel.lean.mockResolvedValue(mockReportDifferentOrg);
      jest.spyOn(userService, 'findOne').mockResolvedValue(mockUser as any);
      jest.spyOn(projectService, 'findById').mockResolvedValue(mockProjectDifferentOrg as any);

      await expect(
        service.getReport('report456', 'user123')
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});