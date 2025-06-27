import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { OrganizationAccessService } from './organization-access.service';
import { User } from '../../modules/user/schemas/user.schema';
import { Project } from '../../modules/project/schemas/project-base.schema';
import { Organization } from '../../modules/organization/schemas/organization.schema';

describe('OrganizationAccessService', () => {
  let service: OrganizationAccessService;
  let userModel: any;
  let projectModel: any;
  let organizationModel: any;

  const mockUser = {
    _id: 'user123',
    id: 'user123',
    organizationId: 'org123',
    email: 'user@test.com',
  };

  const mockUserDifferentOrg = {
    _id: 'user456',
    id: 'user456',
    organizationId: 'org456',
    email: 'user2@test.com',
  };

  const mockProject = {
    _id: 'project123',
    id: 'project123',
    organizationId: 'org123',
    name: 'Test Project',
  };

  const mockProjectDifferentOrg = {
    _id: 'project456',
    id: 'project456',
    organizationId: 'org456',
    name: 'Other Org Project',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationAccessService,
        {
          provide: getModelToken(User.name),
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: getModelToken(Project.name),
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: getModelToken(Organization.name),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<OrganizationAccessService>(OrganizationAccessService);
    userModel = module.get(getModelToken(User.name));
    projectModel = module.get(getModelToken(Project.name));
    organizationModel = module.get(getModelToken(Organization.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUserAccess', () => {
    it('should return user and organizationId when user exists', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.validateUserAccess('user123');

      expect(result.user).toEqual(mockUser);
      expect(result.organizationId).toBe('org123');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.validateUserAccess('user123')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when user has no organization', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ ...mockUser, organizationId: null }),
      });

      await expect(service.validateUserAccess('user123')).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('validateOrganizationAccess', () => {
    it('should not throw when user belongs to the organization', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        service.validateOrganizationAccess('user123', 'org123')
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when user belongs to different organization', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(
        service.validateOrganizationAccess('user123', 'org456')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateProjectAccess', () => {
    it('should return project when user has access', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
      projectModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProject),
      });

      const result = await service.validateProjectAccess('user123', 'project123');

      expect(result).toEqual(mockProject);
    });

    it('should throw UnauthorizedException when project not found', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
      projectModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.validateProjectAccess('user123', 'project123')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when project belongs to different organization', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });
      projectModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProjectDifferentOrg),
      });

      await expect(
        service.validateProjectAccess('user123', 'project456')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateUserToUserAccess', () => {
    it('should not throw when both users are in the same organization', async () => {
      userModel.findById
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockUser),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue({ ...mockUser, id: 'user789' }),
        });

      await expect(
        service.validateUserToUserAccess('user123', 'user789')
      ).resolves.not.toThrow();
    });

    it('should throw ForbiddenException when users are in different organizations', async () => {
      userModel.findById
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockUser),
        })
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(mockUserDifferentOrg),
        });

      await expect(
        service.validateUserToUserAccess('user123', 'user456')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('validateResourceAccess', () => {
    it('should not throw when resource belongs to user organization', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const resource = { organizationId: 'org123', name: 'Test Resource' };

      await expect(
        service.validateResourceAccess('user123', resource, 'Resource')
      ).resolves.not.toThrow();
    });

    it('should throw UnauthorizedException when resource is null', async () => {
      await expect(
        service.validateResourceAccess('user123', null, 'Resource')
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when resource belongs to different organization', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const resource = { organizationId: 'org456', name: 'Other Org Resource' };

      await expect(
        service.validateResourceAccess('user123', resource, 'Resource')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('filterByOrganization', () => {
    it('should return only resources from user organization', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const resources = [
        { id: '1', organizationId: 'org123', name: 'Resource 1' },
        { id: '2', organizationId: 'org456', name: 'Resource 2' },
        { id: '3', organizationId: 'org123', name: 'Resource 3' },
      ];

      const filtered = await service.filterByOrganization('user123', resources);

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual([
        { id: '1', organizationId: 'org123', name: 'Resource 1' },
        { id: '3', organizationId: 'org123', name: 'Resource 3' },
      ]);
    });
  });

  describe('addOrganizationFilter', () => {
    it('should add organizationId to query', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const query = { status: 'active' };
      const result = await service.addOrganizationFilter('user123', query);

      expect(result).toEqual({
        status: 'active',
        organizationId: 'org123',
      });
    });

    it('should work with empty query', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await service.addOrganizationFilter('user123');

      expect(result).toEqual({
        organizationId: 'org123',
      });
    });
  });
});