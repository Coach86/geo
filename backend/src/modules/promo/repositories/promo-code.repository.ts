import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PromoCode, PromoCodeDocument } from '../schemas/promo-code.schema';

@Injectable()
export class PromoCodeRepository {
  constructor(
    @InjectModel(PromoCode.name) private promoCodeModel: Model<PromoCodeDocument>,
  ) {}

  async create(promoCodeData: Partial<PromoCode>): Promise<PromoCodeDocument> {
    const promoCode = new this.promoCodeModel(promoCodeData);
    return promoCode.save();
  }

  async findByCode(code: string): Promise<PromoCodeDocument | null> {
    return this.promoCodeModel.findOne({ code: code.toUpperCase() }).exec();
  }

  async findById(id: string): Promise<PromoCodeDocument | null> {
    return this.promoCodeModel.findById(id).exec();
  }

  async findAll(): Promise<PromoCodeDocument[]> {
    return this.promoCodeModel.find().sort({ createdAt: -1 }).exec();
  }

  async findActive(): Promise<PromoCodeDocument[]> {
    const now = new Date();
    return this.promoCodeModel.find({
      isActive: true,
      $and: [
        {
          $or: [
            { validFrom: { $exists: false } },
            { validFrom: { $lte: now } }
          ]
        },
        {
          $or: [
            { validUntil: { $exists: false } },
            { validUntil: { $gte: now } }
          ]
        }
      ]
    }).exec();
  }

  async update(id: string, updateData: Partial<PromoCode>): Promise<PromoCodeDocument | null> {
    return this.promoCodeModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true }
    ).exec();
  }

  async incrementUsage(id: string): Promise<PromoCodeDocument | null> {
    return this.promoCodeModel.findByIdAndUpdate(
      id,
      { $inc: { currentUses: 1 } },
      { new: true }
    ).exec();
  }

  async delete(id: string): Promise<PromoCodeDocument | null> {
    return this.promoCodeModel.findByIdAndDelete(id).exec();
  }

  async deactivate(id: string): Promise<PromoCodeDocument | null> {
    return this.promoCodeModel.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true }
    ).exec();
  }
}