import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AccessTokenDocument = AccessToken & Document;

@Schema()
export class AccessToken {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ type: Object, default: {} })
  metadata?: {
    trialDays?: number;
    planId?: string;
    promoCode?: string;
    [key: string]: any;
  };
}

export const AccessTokenSchema = SchemaFactory.createForClass(AccessToken);