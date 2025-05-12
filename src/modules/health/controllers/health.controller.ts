import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../../services/prisma.service';

@ApiTags('health')
@Controller('healthz')
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}

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
        database: { type: 'string', example: 'connected' },
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
    try {
      // Test database connection
      await this.prismaService.$queryRaw`SELECT 1`;
      
      // Return health status
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
        uptime: process.uptime(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Health check failed: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}