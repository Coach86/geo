import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DomainAuthority, DomainAuthorityDocument } from '../schemas/domain-authority.schema';

@Injectable()
export class DomainAuthorityRepository {
  constructor(
    @InjectModel(DomainAuthority.name)
    private domainAuthorityModel: Model<DomainAuthorityDocument>,
  ) {}

  async findByDomain(domain: string): Promise<DomainAuthorityDocument | null> {
    return this.domainAuthorityModel.findOne({ domain }).exec();
  }

  async create(data: Partial<DomainAuthority>): Promise<DomainAuthorityDocument> {
    const domainAuthority = new this.domainAuthorityModel({
      ...data,
      lastCheckedAt: new Date(),
    });
    return domainAuthority.save();
  }

  async update(
    domain: string,
    data: Partial<DomainAuthority>,
  ): Promise<DomainAuthorityDocument | null> {
    return this.domainAuthorityModel
      .findOneAndUpdate(
        { domain },
        { 
          ...data, 
          lastCheckedAt: new Date() 
        },
        { new: true },
      )
      .exec();
  }

  async upsert(data: Partial<DomainAuthority>): Promise<DomainAuthorityDocument> {
    return this.domainAuthorityModel
      .findOneAndUpdate(
        { domain: data.domain },
        {
          ...data,
          lastCheckedAt: new Date(),
        },
        { new: true, upsert: true },
      )
      .exec();
  }

  async isExpired(domain: string): Promise<boolean> {
    const authority = await this.findByDomain(domain);
    if (!authority) return true;

    const ttlMs = (authority.ttlDays || 30) * 24 * 60 * 60 * 1000;
    const expiryDate = new Date(authority.lastCheckedAt.getTime() + ttlMs);
    return new Date() > expiryDate;
  }

  async deleteExpired(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.domainAuthorityModel.deleteMany({
      lastCheckedAt: { $lt: thirtyDaysAgo },
    }).exec();

    return result.deletedCount || 0;
  }
}