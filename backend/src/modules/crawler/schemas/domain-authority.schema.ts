import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DomainAuthorityDocument = DomainAuthority & Document;

@Schema({ timestamps: true })
export class DomainAuthority {
  @Prop({ required: true, unique: true, index: true })
  domain: string;

  @Prop({ 
    required: true, 
    enum: ['low', 'medium', 'high', 'unknown'],
    default: 'unknown' 
  })
  authorityLevel: 'low' | 'medium' | 'high' | 'unknown';

  @Prop({ required: true })
  authorityInfo: string;

  @Prop()
  justification?: string;

  @Prop({ default: 0 })
  score: number;

  @Prop()
  lastCheckedAt: Date;

  @Prop({ default: 30 })
  ttlDays: number; // Time to live in days before re-checking

  createdAt?: Date;
  updatedAt?: Date;
}

export const DomainAuthoritySchema = SchemaFactory.createForClass(DomainAuthority);

// Add index for faster queries
DomainAuthoritySchema.index({ domain: 1 });
DomainAuthoritySchema.index({ lastCheckedAt: 1 });