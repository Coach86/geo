import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import mongoose from 'mongoose';

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoService.name);
  
  async onModuleInit() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/geo';
      await mongoose.connect(mongoUri);
      this.logger.log('Connected to MongoDB successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to MongoDB: ${error.message}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await mongoose.disconnect();
      this.logger.log('Disconnected from MongoDB successfully');
    } catch (error) {
      this.logger.error(`Failed to disconnect from MongoDB: ${error.message}`);
    }
  }
}