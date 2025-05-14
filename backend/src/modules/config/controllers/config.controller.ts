import { Controller, Get } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller('config')
export class ConfigController {
  @Get()
  getConfig() {
    const configPath = path.resolve(process.cwd(), 'config.json');
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    return config;
  }
}