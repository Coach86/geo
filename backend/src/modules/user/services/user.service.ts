import { Injectable, Logger, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdatePhoneDto } from '../dto/update-phone.dto';
import { UpdateEmailDto } from '../dto/update-email.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserRepository } from '../repositories/user.repository';
import { UserDocument } from '../schemas/user.schema';
import { User as UserEntity } from '../entities/user.entity';
import { Project } from '../../project/entities/project.entity';
import { OrganizationService } from '../../organization/services/organization.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private userRepository: UserRepository,
    @Inject(forwardRef(() => OrganizationService))
    private organizationService: OrganizationService,
  ) {}

  /**
   * Create a new user
   * @param createUserDto - User creation data
   * @returns Created user
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      this.logger.log(`Creating user with email: ${createUserDto.email}`);

      let organizationId = createUserDto.organizationId;

      // If no organizationId is provided, create a new organization with defaults
      if (!organizationId) {
        this.logger.log(`No organizationId provided, creating default organization for user: ${createUserDto.email}`);
        
        const newOrganization = await this.organizationService.create({
          // Plan settings will use the defaults from ORGANIZATION_DEFAULTS
        });
        
        organizationId = newOrganization.id;
        this.logger.log(`Created organization ${organizationId} for user ${createUserDto.email}`);
      }

      const userData = {
        id: uuidv4(),
        email: createUserDto.email,
        language: createUserDto.language || 'en',
        organizationId: organizationId,
      };

      const savedUser = await this.userRepository.save(userData);

      return this.mapToResponseDto(savedUser);
    } catch (error) {
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find all users
   * @returns List of all users
   */
  async findAll(): Promise<UserResponseDto[]> {
    try {
      const users = await this.userRepository.findAll();
      const userDtos = [];

      for (const user of users) {
        // Get user with projects
        const userWithProjects = await this.userRepository.mapToEntityWithProjects(user);
        userDtos.push(this.mapToEntityDto(userWithProjects));
      }

      return userDtos;
    } catch (error) {
      this.logger.error(`Failed to find users: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find a user by ID
   * @param id - User ID
   * @returns User with the specified ID
   */
  async findOne(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findById(id);
      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error(`Failed to find user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Find a user by email
   * @param email - User email
   * @returns User with the specified email
   */
  async findByEmail(email: string): Promise<UserResponseDto> {
    try {
      const user = await this.userRepository.findByEmail(email);

      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      const userWithProjects = await this.userRepository.mapToEntityWithProjects(user);
      return this.mapToEntityDto(userWithProjects);
    } catch (error) {
      this.logger.error(`Failed to find user by email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update a user
   * @param id - User ID
   * @param updateUserDto - User update data
   * @returns Updated user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    try {
      // Check if user exists
      await this.findOne(id);

      const updateData = {
        ...(updateUserDto.email && { email: updateUserDto.email }),
        ...(updateUserDto.language && { language: updateUserDto.language }),
        ...(updateUserDto.phoneNumber !== undefined && { phoneNumber: updateUserDto.phoneNumber }),
        ...(updateUserDto.planSettings && { planSettings: updateUserDto.planSettings }),
        ...(updateUserDto.selectedModels !== undefined && {
          selectedModels: updateUserDto.selectedModels,
        }),
        ...(updateUserDto.stripePlanId !== undefined && {
          stripePlanId: updateUserDto.stripePlanId,
        }),
        ...(updateUserDto.organizationId !== undefined && {
          organizationId: updateUserDto.organizationId,
        }),
      };

      const updatedUser = await this.userRepository.update(id, updateData);
      return this.mapToResponseDto(updatedUser);
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user phone number
   * @param id - User ID
   * @param updatePhoneDto - Phone number update data
   * @returns Updated user
   */
  async updatePhone(id: string, updatePhoneDto: UpdatePhoneDto): Promise<UserResponseDto> {
    try {
      this.logger.log(`Updating phone number for user: ${id}`);

      // Check if user exists
      await this.findOne(id);

      const updateData = {
        phoneNumber: updatePhoneDto.phoneNumber,
      };

      const updatedUser = await this.userRepository.update(id, updateData);
      this.logger.log(`Phone number updated successfully for user: ${id}`);

      return this.mapToResponseDto(updatedUser);
    } catch (error) {
      this.logger.error(`Failed to update phone number: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user email
   * @param id - User ID
   * @param updateEmailDto - Email update data
   * @returns Updated user
   */
  async updateEmail(id: string, updateEmailDto: UpdateEmailDto): Promise<UserResponseDto> {
    try {
      this.logger.log(`Updating email for user: ${id}`);

      // Check if user exists
      await this.findOne(id);

      // Check if email is already taken by another user
      const existingUser = await this.userRepository.findByEmail(updateEmailDto.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Email already in use');
      }

      const updateData = {
        email: updateEmailDto.email,
      };

      const updatedUser = await this.userRepository.update(id, updateData);
      this.logger.log(`Email updated successfully for user: ${id}`);

      return this.mapToResponseDto(updatedUser);
    } catch (error) {
      this.logger.error(`Failed to update email: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Remove a user
   * @param id - User ID
   * @returns Deleted user
   */
  async remove(id: string): Promise<UserResponseDto> {
    try {
      // Check if user exists and get the user before deleting
      const user = await this.findOne(id);

      // Delete the user
      await this.userRepository.remove(id);

      return user;
    } catch (error) {
      this.logger.error(`Failed to remove user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Map a User entity to a UserResponseDto
   * @param entity - User entity
   * @returns UserResponseDto
   */
  private mapToEntityDto(entity: UserEntity): UserResponseDto {
    const projectIds = entity.projects
      ? entity.projects.map((project: Project) => project.projectId)
      : [];

    return {
      id: entity.id,
      email: entity.email,
      language: entity.language,
      phoneNumber: entity.phoneNumber,
      organizationId: entity.organizationId,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      projectIds,
    };
  }

  /**
   * Map a Mongoose User model to a UserResponseDto
   * @param user - Mongoose User model
   * @returns UserResponseDto
   */
  private mapToResponseDto(user: UserDocument): UserResponseDto {
    const entity = this.userRepository.mapToEntity(user);
    return this.mapToEntityDto(entity);
  }

  /**
   * Get project IDs for a user
   * @param userId - User ID
   * @returns Array of project IDs
   */
  async getUserProjectIds(userId: string): Promise<string[]> {
    try {
      const projects = await this.userRepository.findProjectsForUser(userId);
      return projects ? projects.map((p) => p.id) : [];
    } catch (error) {
      this.logger.error(`Failed to get user company IDs: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Find users by organization ID
   * @param organizationId - Organization ID
   * @returns List of users in the organization
   */
  async findByOrganizationId(organizationId: string): Promise<UserResponseDto[]> {
    try {
      const users = await this.userRepository.findByOrganizationId(organizationId);
      const userDtos = [];
      
      for (const user of users) {
        const userWithProjects = await this.userRepository.mapToEntityWithProjects(user);
        userDtos.push(this.mapToEntityDto(userWithProjects));
      }
      
      return userDtos;
    } catch (error) {
      this.logger.error(`Failed to find users by organization: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Update user's last connection timestamp
   * @param userId - User ID
   * @returns Updated user
   */
  async updateLastConnection(userId: string): Promise<void> {
    try {
      await this.userRepository.update(userId, { lastConnectionAt: new Date() });
      this.logger.log(`Updated last connection for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to update last connection: ${error.message}`, error.stack);
      // Don't throw error to avoid failing authentication flow
    }
  }
}
