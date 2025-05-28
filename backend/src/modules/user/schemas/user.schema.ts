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
    index: true 
  })
  email: string;

  @Prop({ default: 'en' })
  language: string;

  @Prop({ type: String, required: false })
  phoneNumber?: string;

  @Prop({ type: String, required: false })
  stripeCustomerId?: string;

  @Prop({ type: String, required: false })
  stripePlanId?: string;

  @Prop({
    type: {
      maxBrands: { type: Number, default: 1 },
      maxAIModels: { type: Number, default: 3 },
    },
    default: {
      maxBrands: 1,
      maxAIModels: 3,
    },
  })
  planSettings: {
    maxBrands: number;
    maxAIModels: number;
  };
  
  @Prop({ type: Date })
  createdAt: Date;
  
  @Prop({ type: Date })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// No need for _id virtual since Mongoose already creates _id