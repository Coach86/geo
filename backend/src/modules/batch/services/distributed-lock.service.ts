import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CronLock, CronLockDocument } from '../schemas/cron-lock.schema';
import * as os from 'os';

export interface LockResult {
  acquired: boolean;
  instanceId?: string;
  lockHolder?: string;
}

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);
  private readonly instanceId: string;

  constructor(
    @InjectModel(CronLock.name) private cronLockModel: Model<CronLockDocument>,
  ) {
    // Generate unique instance ID
    this.instanceId = `${os.hostname()}-${process.pid}-${Date.now()}`;
    this.logger.log(`Distributed lock service initialized with instance ID: ${this.instanceId}`);
  }

  /**
   * Try to acquire a distributed lock
   * @param lockName - Name of the lock to acquire
   * @param ttlMinutes - Time to live in minutes before lock expires
   * @returns LockResult indicating if lock was acquired
   */
  async acquireLock(lockName: string, ttlMinutes: number = 60): Promise<LockResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

    try {
      // Try to acquire lock atomically
      const result = await this.cronLockModel.findOneAndUpdate(
        {
          lockName,
          $or: [
            // Lock doesn't exist
            { lockName: { $exists: false } },
            // Lock exists but expired
            { expiresAt: { $lt: now } }
          ]
        },
        {
          $set: {
            lockName,
            instanceId: this.instanceId,
            acquiredAt: now,
            expiresAt
          }
        },
        {
          upsert: true,
          new: true,
          // This ensures atomicity
          setDefaultsOnInsert: true
        }
      );

      // Check if we actually got the lock
      if (result && result.instanceId === this.instanceId) {
        this.logger.log(`Lock '${lockName}' acquired by ${this.instanceId}, expires at ${expiresAt}`);
        return {
          acquired: true,
          instanceId: this.instanceId
        };
      }

      // Someone else has the lock
      const currentLock = await this.cronLockModel.findOne({ lockName });
      this.logger.log(`Lock '${lockName}' is held by ${currentLock?.instanceId}, expires at ${currentLock?.expiresAt}`);
      
      return {
        acquired: false,
        lockHolder: currentLock?.instanceId
      };

    } catch (error) {
      // Handle duplicate key error (race condition where two instances try to create at same time)
      if (error.code === 11000) {
        this.logger.log(`Lock '${lockName}' already exists, checking current holder...`);
        
        const currentLock = await this.cronLockModel.findOne({ lockName });
        
        // If lock expired, try to acquire it
        if (currentLock && currentLock.expiresAt < now) {
          // Delete expired lock and retry
          await this.cronLockModel.deleteOne({ lockName, expiresAt: { $lt: now } });
          return this.acquireLock(lockName, ttlMinutes);
        }
        
        return {
          acquired: false,
          lockHolder: currentLock?.instanceId
        };
      }
      
      this.logger.error(`Failed to acquire lock '${lockName}': ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Release a distributed lock
   * @param lockName - Name of the lock to release
   * @returns boolean indicating if lock was released
   */
  async releaseLock(lockName: string): Promise<boolean> {
    try {
      const result = await this.cronLockModel.deleteOne({
        lockName,
        instanceId: this.instanceId
      });

      if (result.deletedCount > 0) {
        this.logger.log(`Lock '${lockName}' released by ${this.instanceId}`);
        return true;
      } else {
        this.logger.warn(`Lock '${lockName}' not found or not owned by ${this.instanceId}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to release lock '${lockName}': ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Check if a lock is currently held
   * @param lockName - Name of the lock to check
   * @returns Object with lock status
   */
  async isLocked(lockName: string): Promise<{ locked: boolean; holder?: string; expiresAt?: Date }> {
    try {
      const lock = await this.cronLockModel.findOne({ lockName });
      
      if (!lock) {
        return { locked: false };
      }

      const now = new Date();
      if (lock.expiresAt < now) {
        // Lock is expired
        return { locked: false };
      }

      return {
        locked: true,
        holder: lock.instanceId,
        expiresAt: lock.expiresAt
      };
    } catch (error) {
      this.logger.error(`Failed to check lock '${lockName}': ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Clean up expired locks (called periodically)
   */
  async cleanExpiredLocks(): Promise<number> {
    try {
      const result = await this.cronLockModel.deleteMany({
        expiresAt: { $lt: new Date() }
      });

      if (result.deletedCount > 0) {
        this.logger.log(`Cleaned up ${result.deletedCount} expired locks`);
      }

      return result.deletedCount;
    } catch (error) {
      this.logger.error(`Failed to clean expired locks: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * Force release all locks (useful for testing or emergency situations)
   * WARNING: Use with caution in production
   */
  async forceReleaseAllLocks(): Promise<number> {
    try {
      const result = await this.cronLockModel.deleteMany({});
      this.logger.warn(`Force released ${result.deletedCount} locks`);
      return result.deletedCount;
    } catch (error) {
      this.logger.error(`Failed to force release locks: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * Get current instance ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }
}