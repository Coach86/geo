import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>
  ) {}

  /**
   * Create a new user
   * @param createUserDto - User creation data
   * @returns Created user
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    try {
      this.logger.log(`Creating user with email: ${createUserDto.email}`);

      const newUser = new this.userModel({
        id: uuidv4(),
        email: createUserDto.email,
        language: createUserDto.language || 'en',
      });

      const savedUser = await newUser.save();
      
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
      const users = await this.userModel.find().exec();

      // Get the company IDs for each user by population in MongoDB
      // For now we'll just return the users without company IDs
      // We'll implement a proper population later
      return users.map(user => this.mapToResponseDto(user));
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
      const user = await this.userModel.findOne({ id }).exec();

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

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
      const user = await this.userModel.findOne({ email }).exec();

      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      return this.mapToResponseDto(user);
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

      const updatedUser = await this.userModel.findOneAndUpdate(
        { id },
        { $set: updateData },
        { new: true } // Return the updated document
      ).exec();

      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

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
      // Check if user exists
      const user = await this.findOne(id);

      // Mongoose doesn't return the deleted document by default,
      // so we need to get it before deleting
      await this.userModel.findOneAndDelete({ id }).exec();

      return user;
    } catch (error) {
      this.logger.error(`Failed to remove user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Map a Mongoose User model to a UserResponseDto
   * @param user - Mongoose User model
   * @returns UserResponseDto
   */
  private mapToResponseDto(user: UserDocument): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      language: user.language,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
      companyIds: [], // We'll implement this when we set up the relationships
    };
  }
}