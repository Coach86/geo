import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from '../schemas/admin.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Admin.name) private adminModel: Model<AdminDocument>,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<any> {
    const admin = await this.adminModel.findOne({ email }).exec();
    
    if (admin && await bcrypt.compare(password, admin.passwordHash)) {
      // Update last login timestamp
      await this.adminModel.updateOne(
        { _id: admin._id },
        { $set: { lastLogin: new Date() } }
      );
      
      const { passwordHash, ...result } = admin.toObject();
      return result;
    }
    
    return null;
  }

  async login(admin: any) {
    const payload = { 
      email: admin.email, 
      sub: admin.id
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        email: admin.email
      }
    };
  }
  
  async refreshToken(admin: any) {
    const payload = { 
      email: admin.email, 
      sub: admin.id
    };
    
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}