import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type AdminDocument = Admin & Document;

@Schema({
  collection: 'admins',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Admin {
  @Prop({ 
    type: String, 
    default: () => uuidv4(),
    index: true,
  })
  id: string;

  @Prop({ 
    type: String, 
    required: true,
    unique: true
  })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: Date, required: false })
  lastLogin: Date;
  
  @Prop({ type: Date })
  createdAt: Date;
  
  @Prop({ type: Date })
  updatedAt: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);