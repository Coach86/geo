import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type UserDocument = User & Document;

@Schema({
  collection: 'users',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }, // Explicitly name timestamp fields
})
export class User {
  @Prop({
    type: String,
    default: () => uuidv4(),
    index: true,
  })
  id: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  email: string;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ type: String, required: false })
  phoneNumber?: string;

  @Prop({ required: true, index: true })
  organizationId: string;

  @Prop({ type: Date })
  lastConnectionAt?: Date;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;

  @Prop({ type: String, sparse: true, index: true })
  shopifyShopDomain?: string;

  @Prop({ type: String })
  shopifyShopId?: string;

  @Prop({ enum: ['standard', 'shopify'], default: 'standard' })
  authType: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// No need for _id virtual since Mongoose already creates _id
