import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromoUsage, PromoUsageDocument } from '../schemas/promo-usage.schema';

@Injectable()
export class PromoUsageRepository {
  constructor(
    @InjectModel(PromoUsage.name) private promoUsageModel: Model<PromoUsageDocument>,
  ) {}

  async create(usageData: Partial<PromoUsage>): Promise<PromoUsageDocument> {
    const usage = new this.promoUsageModel(usageData);
    return usage.save();
  }

  async findByUserAndPromoCode(userId: string, promoCodeId: string): Promise<PromoUsageDocument | null> {
    return this.promoUsageModel.findOne({ userId, promoCodeId }).exec();
  }

  async findByOrganization(organizationId: string): Promise<PromoUsageDocument[]> {
    return this.promoUsageModel.find({ organizationId }).exec();
  }

  async findByPromoCode(promoCodeId: string): Promise<PromoUsageDocument[]> {
    return this.promoUsageModel.find({ promoCodeId }).exec();
  }

  async findActiveByOrganization(organizationId: string): Promise<PromoUsageDocument[]> {
    return this.promoUsageModel.find({ 
      organizationId, 
      isActive: true,
      $or: [
        { expiresAt: { $exists: false } },
        { expiresAt: { $gte: new Date() } }
      ]
    }).exec();
  }

  async deactivate(id: string): Promise<PromoUsageDocument | null> {
    return this.promoUsageModel.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    ).exec();
  }

  async deactivateBySubscription(stripeSubscriptionId: string): Promise<void> {
    await this.promoUsageModel.updateMany(
      { stripeSubscriptionId },
      { $set: { isActive: false } }
    ).exec();
  }
}