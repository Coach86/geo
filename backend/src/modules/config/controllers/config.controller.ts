import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger';;
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TokenRoute } from '../../auth/decorators/token-route.decorator';
import { ConfigService } from '../services/config.service';

@ApiTags('Admin - Configuration')
@Controller('admin/config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getConfig() {
    return this.configService.getConfig();
  }
}

@Controller('config')
@UseGuards(JwtAuthGuard)
export class PublicConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('models')
  @TokenRoute()
  getModels() {
    return {
      models: this.configService.getAvailableModels()
    };
  }
}
