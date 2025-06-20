import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PromoCodeRepository } from '../repositories/promo-code.repository';
import { PromoUsageRepository } from '../repositories/promo-usage.repository';
import { CreatePromoCodeDto } from '../dto/create-promo-code.dto';
import { ValidatePromoCodeDto, PromoCodeValidationResponseDto } from '../dto/validate-promo-code.dto';
import { PromoCodeDocument, DiscountType } from '../schemas/promo-code.schema';
import { PromoUsageDocument } from '../schemas/promo-usage.schema';

@Injectable()
export class PromoCodeService {
  private readonly logger = new Logger(PromoCodeService.name);

  constructor(
    private promoCodeRepository: PromoCodeRepository,
    private promoUsageRepository: PromoUsageRepository,
  ) {}

  async create(createPromoCodeDto: CreatePromoCodeDto): Promise<PromoCodeDocument> {
    try {
      // Check if code already exists
      const existing = await this.promoCodeRepository.findByCode(createPromoCodeDto.code);
      if (existing) {
        throw new ConflictException(`Promo code ${createPromoCodeDto.code} already exists`);
      }

      // Validate discount value based on type
      if (createPromoCodeDto.discountType === DiscountType.PERCENTAGE) {
        if (createPromoCodeDto.discountValue < 0 || createPromoCodeDto.discountValue > 100) {
          throw new BadRequestException('Percentage discount must be between 0 and 100');
        }
      }

      // Create promo code with uppercase code
      const promoCode = await this.promoCodeRepository.create({
        ...createPromoCodeDto,
        code: createPromoCodeDto.code.toUpperCase(),
        currentUses: 0,
        validFrom: createPromoCodeDto.validFrom ? new Date(createPromoCodeDto.validFrom) : undefined,
        validUntil: createPromoCodeDto.validUntil ? new Date(createPromoCodeDto.validUntil) : undefined,
      });

      this.logger.log(`Created promo code: ${promoCode.code}`);
      return promoCode;
    } catch (error) {
      this.logger.error(`Failed to create promo code: ${error.message}`, error.stack);
      throw error;
    }
  }

  async validate(validateDto: ValidatePromoCodeDto): Promise<PromoCodeValidationResponseDto> {
    try {
      const promoCode = await this.promoCodeRepository.findByCode(validateDto.code);

      if (!promoCode) {
        return { valid: false, reason: 'Promo code not found' };
      }

      // Check if active
      if (!promoCode.isActive) {
        return { valid: false, reason: 'Promo code is not active' };
      }

      // Check validity dates
      const now = new Date();
      if (promoCode.validFrom && promoCode.validFrom > now) {
        return { valid: false, reason: 'Promo code is not yet valid' };
      }
      if (promoCode.validUntil && promoCode.validUntil < now) {
        return { valid: false, reason: 'Promo code has expired' };
      }

      // Check usage limits
      if (promoCode.maxUses !== -1 && promoCode.currentUses >= promoCode.maxUses) {
        return { valid: false, reason: 'Promo code has reached maximum uses' };
      }

      // Check if valid for the plan
      if (validateDto.planId && promoCode.validPlanIds.length > 0) {
        if (!promoCode.validPlanIds.includes(validateDto.planId)) {
          return { valid: false, reason: 'Promo code is not valid for this plan' };
        }
      }

      // Check if user has already used this promo
      if (validateDto.userId) {
        const existingUsage = await this.promoUsageRepository.findByUserAndPromoCode(
          validateDto.userId,
          promoCode.id,
        );
        if (existingUsage) {
          return { valid: false, reason: 'Promo code has already been used by this user' };
        }
      }

      return {
        valid: true,
        promoCode: {
          code: promoCode.code,
          discountType: promoCode.discountType,
          discountValue: promoCode.discountValue,
          durationType: promoCode.durationType,
          durationInMonths: promoCode.durationInMonths,
          trialPlanId: promoCode.trialPlanId,
          description: promoCode.description,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to validate promo code: ${error.message}`, error.stack);
      throw error;
    }
  }

  async apply(
    promoCode: string,
    userId: string,
    organizationId: string,
    stripeSubscriptionId?: string,
  ): Promise<PromoUsageDocument> {
    try {
      const promo = await this.promoCodeRepository.findByCode(promoCode);
      if (!promo) {
        throw new NotFoundException('Promo code not found');
      }

      // Validate the promo code
      const validation = await this.validate({ code: promoCode, userId });
      if (!validation.valid) {
        throw new BadRequestException(validation.reason);
      }

      // Create usage record
      const usage = await this.promoUsageRepository.create({
        promoCodeId: promo.id,
        userId,
        organizationId,
        stripeSubscriptionId,
        appliedDiscount: {
          type: promo.discountType,
          value: promo.discountValue,
          duration: promo.durationType,
          durationInMonths: promo.durationInMonths,
        },
        usedAt: new Date(),
      });

      // Increment usage count
      await this.promoCodeRepository.incrementUsage(promo.id);

      this.logger.log(`Applied promo code ${promoCode} for user ${userId}`);
      return usage;
    } catch (error) {
      this.logger.error(`Failed to apply promo code: ${error.message}`, error.stack);
      throw error;
    }
  }

  async findAll(): Promise<PromoCodeDocument[]> {
    return this.promoCodeRepository.findAll();
  }

  async findActive(): Promise<PromoCodeDocument[]> {
    return this.promoCodeRepository.findActive();
  }

  async findById(id: string): Promise<PromoCodeDocument> {
    const promoCode = await this.promoCodeRepository.findById(id);
    if (!promoCode) {
      throw new NotFoundException(`Promo code with ID ${id} not found`);
    }
    return promoCode;
  }

  async deactivate(id: string): Promise<PromoCodeDocument> {
    const promoCode = await this.promoCodeRepository.deactivate(id);
    if (!promoCode) {
      throw new NotFoundException(`Promo code with ID ${id} not found`);
    }
    this.logger.log(`Deactivated promo code: ${promoCode.code}`);
    return promoCode;
  }

  async getUsageStats(promoCodeId: string): Promise<{
    totalUses: number;
    activeUses: number;
    users: PromoUsageDocument[];
  }> {
    const promoCode = await this.findById(promoCodeId);
    const usages = await this.promoUsageRepository.findByPromoCode(promoCodeId);
    const activeUses = usages.filter(u => u.isActive).length;

    return {
      totalUses: promoCode.currentUses,
      activeUses,
      users: usages,
    };
  }

  async getOrganizationPromoCodes(organizationId: string): Promise<PromoUsageDocument[]> {
    return this.promoUsageRepository.findActiveByOrganization(organizationId);
  }
}