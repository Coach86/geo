import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdatePhoneDto } from '../dto/update-phone.dto';
import { UpdateEmailDto } from '../dto/update-email.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UserRepository } from '../repositories/user.repository';
import { UserDocument } from '../schemas/user.schema';
import { User as UserEntity } from '../entities/user.entity';
import { CompanyIdentityCard } from '../../identity-card/entities/company-identity-card.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private userRepository: UserRepository) {}

  /**
   * Create a new user
   * @param createUserDto - User creation data
   * @returns Created user
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      this.logger.log(`Creating user with email: ${createUserDto.email}`);

      const userData = {
        id: uuidv4(),
        email: createUserDto.email,
        language: createUserDto.language || 'en',
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
        // Get user with companies
        const userWithCompanies = await this.userRepository.mapToEntityWithCompanies(user);
        userDtos.push(this.mapToEntityDto(userWithCompanies));
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

      const userWithCompanies = await this.userRepository.mapToEntityWithCompanies(user);
      return this.mapToEntityDto(userWithCompanies);
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
        ...(updateUserDto.selectedModels !== undefined && { selectedModels: updateUserDto.selectedModels }),
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
    const companyIds = entity.companies 
      ? entity.companies.map((company: CompanyIdentityCard) => company.companyId) 
      : [];
    
    return {
      id: entity.id,
      email: entity.email,
      language: entity.language,
      phoneNumber: entity.phoneNumber,
      stripeCustomerId: entity.stripeCustomerId,
      stripePlanId: entity.stripePlanId,
      planSettings: entity.planSettings,
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      companyIds,
      selectedModels: entity.selectedModels || [],
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
   * Get company IDs for a user
   * @param userId - User ID
   * @returns Array of company IDs
   */
  async getUserCompanyIds(userId: string): Promise<string[]> {
    try {
      const companies = await this.userRepository.findCompaniesForUser(userId);
      return companies ? companies.map(c => c.id) : [];
    } catch (error) {
      this.logger.error(`Failed to get user company IDs: ${error.message}`, error.stack);
      return [];
    }
  }
}
