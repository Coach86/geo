import { Injectable, Logger, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../modules/user/schemas/user.schema';
import { Project, ProjectDocument } from '../../modules/project/schemas/project-base.schema';
import { Organization, OrganizationDocument } from '../../modules/organization/schemas/organization.schema';

export interface AccessValidationResult {
  user: UserDocument;
  organizationId: string;
}

/**
 * Reusable service for validating organization-based access control
 * Ensures users can only access resources within their organization
 */
@Injectable()
export class OrganizationAccessService {
  private readonly logger = new Logger(OrganizationAccessService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
  ) {}

  /**
   * Validates that a user exists and returns their organization context
   * @param userId - The user ID to validate
   * @returns User and their organizationId
   * @throws UnauthorizedException if user not found
   */
  async validateUserAccess(userId: string): Promise<AccessValidationResult> {
    const user = await this.userModel.findById(userId).lean();
    
    if (!user) {
      this.logger.warn(`Access attempt with invalid user ID: ${userId}`);
      throw new UnauthorizedException('User not found');
    }

    if (!user.organizationId) {
      this.logger.warn(`User ${userId} has no organization assigned`);
      throw new UnauthorizedException('User has no organization assigned');
    }

    return {
      user: user as UserDocument,
      organizationId: user.organizationId,
    };
  }

  /**
   * Validates that a user has access to a specific organization
   * @param userId - The user ID to validate
   * @param organizationId - The organization ID to check access for
   * @throws ForbiddenException if user doesn't belong to the organization
   */
  async validateOrganizationAccess(userId: string, organizationId: string): Promise<void> {
    const { organizationId: userOrgId } = await this.validateUserAccess(userId);

    if (userOrgId !== organizationId) {
      this.logger.warn(
        `User ${userId} (org: ${userOrgId}) attempted to access organization ${organizationId}`
      );
      throw new ForbiddenException('Access denied to this organization');
    }
  }

  /**
   * Validates that a user has access to a specific project
   * @param userId - The user ID to validate
   * @param projectId - The project ID to check access for
   * @returns The project if access is granted
   * @throws ForbiddenException if user doesn't have access to the project
   */
  async validateProjectAccess(userId: string, projectId: string): Promise<ProjectDocument> {
    const { organizationId: userOrgId } = await this.validateUserAccess(userId);
    
    const project = await this.projectModel.findById(projectId).lean();
    
    if (!project) {
      throw new UnauthorizedException('Project not found');
    }

    if (project.organizationId !== userOrgId) {
      this.logger.warn(
        `User ${userId} (org: ${userOrgId}) attempted to access project ${projectId} (org: ${project.organizationId})`
      );
      throw new ForbiddenException('Access denied to this project');
    }

    return project as ProjectDocument;
  }

  /**
   * Validates that a user has access to another user's data
   * (both users must be in the same organization)
   * @param requestingUserId - The user making the request
   * @param targetUserId - The user whose data is being accessed
   * @throws ForbiddenException if users are in different organizations
   */
  async validateUserToUserAccess(requestingUserId: string, targetUserId: string): Promise<void> {
    const { organizationId: requestingUserOrgId } = await this.validateUserAccess(requestingUserId);
    
    const targetUser = await this.userModel.findById(targetUserId).lean();
    
    if (!targetUser) {
      throw new UnauthorizedException('Target user not found');
    }

    if (targetUser.organizationId !== requestingUserOrgId) {
      this.logger.warn(
        `User ${requestingUserId} (org: ${requestingUserOrgId}) attempted to access user ${targetUserId} (org: ${targetUser.organizationId})`
      );
      throw new ForbiddenException('Access denied to this user');
    }
  }

  /**
   * Validates that a resource belongs to a user's organization
   * Generic method for any resource with an organizationId field
   * @param userId - The user ID to validate
   * @param resource - The resource with organizationId field
   * @param resourceType - Type of resource for logging
   * @throws ForbiddenException if resource doesn't belong to user's organization
   */
  async validateResourceAccess<T extends { organizationId: string }>(
    userId: string,
    resource: T | null,
    resourceType: string
  ): Promise<void> {
    if (!resource) {
      throw new UnauthorizedException(`${resourceType} not found`);
    }

    const { organizationId: userOrgId } = await this.validateUserAccess(userId);

    if (resource.organizationId !== userOrgId) {
      this.logger.warn(
        `User ${userId} (org: ${userOrgId}) attempted to access ${resourceType} (org: ${resource.organizationId})`
      );
      throw new ForbiddenException(`Access denied to this ${resourceType.toLowerCase()}`);
    }
  }

  /**
   * Filters a list of resources to only include those from the user's organization
   * @param userId - The user ID to validate
   * @param resources - List of resources with organizationId field
   * @returns Filtered list containing only resources from user's organization
   */
  async filterByOrganization<T extends { organizationId: string }>(
    userId: string,
    resources: T[]
  ): Promise<T[]> {
    const { organizationId } = await this.validateUserAccess(userId);
    return resources.filter(resource => resource.organizationId === organizationId);
  }

  /**
   * Adds organization filter to a MongoDB query based on user's organization
   * @param userId - The user ID to validate
   * @param query - Existing query object
   * @returns Query object with organization filter added
   */
  async addOrganizationFilter(userId: string, query: any = {}): Promise<any> {
    const { organizationId } = await this.validateUserAccess(userId);
    return {
      ...query,
      organizationId,
    };
  }
}