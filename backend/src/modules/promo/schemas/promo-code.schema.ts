import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PromoCodeDocument = HydratedDocument<PromoCode>;

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  TRIAL_DAYS = 'trial_days',
  FREE_TRIAL = 'free_trial',
}

export enum DurationType {
  ONCE = 'once',
  FOREVER = 'forever',
  MONTHS = 'months',
}

@Schema({ timestamps: true, collection: 'promo_codes' })
export class PromoCode {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ type: String, enum: DiscountType, required: true })
  discountType: DiscountType;

  @Prop({ required: true })
  discountValue: number; // Percentage (0-100), fixed amount in cents, or number of trial days

  @Prop({ type: String, enum: DurationType, default: DurationType.ONCE })
  durationType: DurationType;

  @Prop({ default: 1 })
  durationInMonths?: number; // Only used when durationType is 'months'

  @Prop({ type: [String], default: [] })
  validPlanIds: string[]; // Empty array means valid for all plans

  @Prop({ type: String })
  trialPlanId?: string; // Plan to use during trial (for trial_days or free_trial types)

  @Prop({ default: -1 })
  maxUses: number; // -1 for unlimited

  @Prop({ default: 0 })
  currentUses: number;

  @Prop({ type: Date })
  validFrom?: Date;

  @Prop({ type: Date })
  validUntil?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const PromoCodeSchema = SchemaFactory.createForClass(PromoCode);

// Add indexes
PromoCodeSchema.index({ code: 1 });
PromoCodeSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });