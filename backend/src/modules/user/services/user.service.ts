import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
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
      const userWithCompanies = await this.userRepository.mapToEntityWithCompanies(user);
      return this.mapToEntityDto(userWithCompanies);
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
      };

      const updatedUser = await this.userRepository.update(id, updateData);
      return this.mapToResponseDto(updatedUser);
    } catch (error) {
      this.logger.error(`Failed to update user: ${error.message}`, error.stack);
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
      createdAt: entity.createdAt.toISOString(),
      updatedAt: entity.updatedAt.toISOString(),
      companyIds,
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
}
