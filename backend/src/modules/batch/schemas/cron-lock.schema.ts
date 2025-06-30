import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CronLockDocument = CronLock & Document;

@Schema({
  collection: 'cron_locks',
  timestamps: false,
})
export class CronLock {
  @Prop({ 
    required: true, 
    unique: true,
    index: true 
  })
  lockName: string;

  @Prop({ required: true })
  instanceId: string;

  @Prop({ 
    required: true,
    type: Date 
  })
  acquiredAt: Date;

  @Prop({ 
    required: true,
    type: Date,
    index: true 
  })
  expiresAt: Date;
}

export const CronLockSchema = SchemaFactory.createForClass(CronLock);

// Add TTL index to automatically remove expired locks
CronLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });