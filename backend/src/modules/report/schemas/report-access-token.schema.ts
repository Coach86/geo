import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportAccessTokenDocument = ReportAccessToken & Document;

@Schema()
export class ReportAccessToken {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  reportId: string;

  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const ReportAccessTokenSchema = SchemaFactory.createForClass(ReportAccessToken);