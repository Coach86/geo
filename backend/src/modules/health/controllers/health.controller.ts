import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MongoService } from '../../../services/mongo.service';

@ApiTags('health')
@Controller('healthz')
export class HealthController {
  constructor(private readonly mongoService: MongoService) {}

  @Get()
  @ApiOperation({ summary: 'Check application health status' })
  @ApiResponse({ 
    status: 200, 
    description: 'The application is healthy', 
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2023-05-20T12:34:56.789Z' },
        uptime: { type: 'number', example: 3600 },
      },
    },
  })
  @ApiResponse({ 
    status: 503, 
    description: 'The application is unhealthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        message: { type: 'string', example: 'Database connection failed' },
        timestamp: { type: 'string', example: '2023-05-20T12:34:56.789Z' },
      },
    },
  })
  async check() {
    // Return health status
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}