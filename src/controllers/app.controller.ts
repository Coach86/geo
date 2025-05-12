import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Welcome endpoint' })
  getHello(): { message: string } {
    return { message: 'Welcome to Brand Insight API' };
  }
}