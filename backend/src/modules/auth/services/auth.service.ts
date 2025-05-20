import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin, AdminDocument } from '../schemas/admin.schema';
import { AdminRepository } from '../repositories/admin.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private jwtService: JwtService,
  ) {}

  async validateAdmin(email: string, password: string): Promise<any> {
    const admin = await this.adminRepository.findByEmail(email);

    if (admin && (await bcrypt.compare(password, admin.passwordHash))) {
      // Update last login timestamp
      await this.adminRepository.updateLastLogin(admin.id);

      // Since we're using lean(), admin is already a plain JS object
      const { passwordHash, ...result } = admin;
      return result;
    }

    return null;
  }

  async login(admin: any) {
    const payload = {
      email: admin.email,
      sub: admin.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        email: admin.email,
      },
    };
  }

  async refreshToken(admin: any) {
    const payload = {
      email: admin.email,
      sub: admin.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
