import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Admin,
  AdminDocument,
} from '../schemas/admin.schema';

/**
 * Repository for Admin MongoDB documents
 * Handles all direct interactions with the MongoDB model
 */
@Injectable()
export class AdminRepository {
  private readonly logger = new Logger(AdminRepository.name);

  constructor(
    @InjectModel(Admin.name)
    private adminModel: Model<AdminDocument>,
  ) {}

  /**
   * Create a new admin user
   * @param adminData Data to create the admin with
   * @returns The created admin document
   */
  async create(adminData: Partial<Admin>): Promise<AdminDocument> {
    this.logger.debug(`Creating new admin with email ${adminData.email}`);
    const newAdmin = new this.adminModel(adminData);
    return newAdmin.save();
  }

  /**
   * Find an admin user by ID
   * @param adminId The unique ID of the admin
   * @returns The admin document or null if not found
   */
  async findById(adminId: string): Promise<AdminDocument | null> {
    this.logger.debug(`Finding admin by ID: ${adminId}`);
    const admin = await this.adminModel.findOne({ id: adminId }).exec();
    return admin;
  }

  /**
   * Find an admin user by email
   * @param email The email address
   * @returns The admin document or null if not found
   */
  async findByEmail(email: string): Promise<AdminDocument | null> {
    this.logger.debug(`Finding admin by email: ${email}`);
    const admin = await this.adminModel.findOne({ email }).exec();
    return admin;
  }

  /**
   * Get all admin users
   * @returns Array of admin documents
   */
  async findAll(): Promise<AdminDocument[]> {
    this.logger.debug('Finding all admins');
    const admins = await this.adminModel.find().exec();
    return admins;
  }

  /**
   * Update an admin user by ID
   * @param adminId The unique ID of the admin
   * @param adminData The data to update
   * @returns The updated admin
   */
  async updateById(
    adminId: string,
    adminData: Partial<Admin>,
  ): Promise<AdminDocument | null> {
    this.logger.debug(`Updating admin: ${adminId}`);
    return this.adminModel
      .findOneAndUpdate({ id: adminId }, adminData, { new: true })
      .exec();
  }

  /**
   * Update an admin user's password hash
   * @param adminId The unique ID of the admin
   * @param passwordHash The new password hash
   * @returns The updated admin
   */
  async updatePasswordHash(
    adminId: string,
    passwordHash: string,
  ): Promise<AdminDocument | null> {
    this.logger.debug(`Updating password hash for admin: ${adminId}`);
    return this.adminModel
      .findOneAndUpdate({ id: adminId }, { passwordHash }, { new: true })
      .exec();
  }

  /**
   * Update last login timestamp for an admin
   * @param adminId The unique ID of the admin
   * @returns The updated admin
   */
  async updateLastLogin(adminId: string): Promise<AdminDocument | null> {
    this.logger.debug(`Updating last login for admin: ${adminId}`);
    return this.adminModel
      .findOneAndUpdate(
        { id: adminId },
        { lastLogin: new Date() },
        { new: true },
      )
      .exec();
  }

  /**
   * Delete an admin user by ID
   * @param adminId The unique ID of the admin
   * @returns True if deleted, false if not found
   */
  async deleteById(adminId: string): Promise<boolean> {
    this.logger.debug(`Deleting admin: ${adminId}`);
    const result = await this.adminModel.deleteOne({ id: adminId }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Delete an admin user by email
   * @param email The email address
   * @returns True if deleted, false if not found
   */
  async deleteByEmail(email: string): Promise<boolean> {
    this.logger.debug(`Deleting admin by email: ${email}`);
    const result = await this.adminModel.deleteOne({ email }).exec();
    return result.deletedCount > 0;
  }

  /**
   * Check if an admin exists with the given email
   * @param email The email address
   * @returns True if exists, false otherwise
   */
  async existsByEmail(email: string): Promise<boolean> {
    this.logger.debug(`Checking if admin exists with email: ${email}`);
    const count = await this.adminModel.countDocuments({ email }).exec();
    return count > 0;
  }
}