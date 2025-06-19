import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PromoUsageDocument = HydratedDocument<PromoUsage>;

@Schema({ timestamps: true, collection: 'promo_usages' })
export class PromoUsage {
  @Prop({ required: true })
  promoCodeId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ type: String })
  stripeSubscriptionId?: string;

  @Prop({ type: Object, default: {} })
  appliedDiscount: {
    type: string;
    value: number;
    duration?: string;
    durationInMonths?: number;
  };

  @Prop({ type: Date, default: Date.now })
  usedAt: Date;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const PromoUsageSchema = SchemaFactory.createForClass(PromoUsage);

// Add indexes
PromoUsageSchema.index({ promoCodeId: 1, userId: 1 });
PromoUsageSchema.index({ organizationId: 1 });
PromoUsageSchema.index({ stripeSubscriptionId: 1 });