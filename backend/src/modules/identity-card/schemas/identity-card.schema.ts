import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../../user/schemas/user.schema';

export type IdentityCardDocument = IdentityCard & Document;

@Schema({
  collection: 'identity_cards',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, // Explicitly name timestamp fields
})
export class IdentityCard {
  @Prop({
    type: String,
    default: () => uuidv4(),
    index: true,
  })
  id: string;

  @Prop({ required: true })
  brandName: string;

  @Prop({ required: true })
  website: string;

  @Prop({ required: true })
  industry: string;

  @Prop({ required: true })
  market: string;

  @Prop({ required: true })
  shortDescription: string;

  @Prop({ required: true })
  fullDescription: string;

  @Prop({
    type: [String],
    required: true,
    default: [],
  })
  keyBrandAttributes: string[];

  @Prop({
    type: [String],
    required: true,
    default: [],
  })
  competitors: string[];

  @Prop({
    type: Object,
    default: {},
  })
  data: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.String, ref: 'User' })
  userId: string;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const IdentityCardSchema = SchemaFactory.createForClass(IdentityCard);
