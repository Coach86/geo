# CloudWatch Logging Configuration Guide

This guide explains how to configure and use the CloudWatch-optimized logging system in the Mint AI backend.

## Overview

The logging system is designed to provide structured, searchable logs in CloudWatch while maintaining developer-friendly output in local development.

## Task Definition Configuration

The `task-definition.json` has been optimized for CloudWatch logging:

```json
"logConfiguration": {
  "logDriver": "awslogs",
  "options": {
    "awslogs-group": "/ecs/brandinsight-server",
    "awslogs-create-group": "true",
    "awslogs-region": "eu-west-1",
    "awslogs-stream-prefix": "ecs",
    "awslogs-datetime-format": "\\[%Y-%m-%d %H:%M:%S\\]",
    "mode": "non-blocking",
    "max-buffer-size": "25m"
  }
}
```

### Key Configuration Options:

- **awslogs-group**: Log group name in CloudWatch
- **awslogs-stream-prefix**: Prefix for log streams (helps identify container instances)
- **awslogs-datetime-format**: Custom timestamp format for parsing
- **mode**: Non-blocking prevents application hangs if logging fails
- **max-buffer-size**: Buffer size for log batching

## Environment Variables

Control logging behavior with these environment variables:

```json
{
  "name": "LOG_LEVEL",
  "value": "info"  // Options: error, warn, info, debug, verbose
},
{
  "name": "LOG_FORMAT",
  "value": "json"  // Options: json, text
},
{
  "name": "ENABLE_CLOUDWATCH_LOGS",
  "value": "true"  // Enable CloudWatch optimizations
}
```

## Logger Configuration

### Production Configuration (CloudWatch)

When `ENABLE_CLOUDWATCH_LOGS=true` or `NODE_ENV=production`:

- **Format**: Structured JSON logs
- **Timestamp**: ISO 8601 format with milliseconds
- **Metadata**: Automatically includes service info, environment, version
- **Error Handling**: Stack traces included for errors

### Development Configuration

When running locally:

- **Format**: Colorized, human-readable logs
- **Timestamp**: Simple format
- **Pretty Print**: Enabled for readability

## Using the Enhanced Logger

### 1. Basic Usage (Existing Pattern)

```typescript
import { Logger } from '@nestjs/common';

export class MyService {
  private readonly logger = new Logger(MyService.name);

  someMethod() {
    this.logger.log('Operation completed');
    this.logger.error('Operation failed', error.stack);
    this.logger.warn('Performance degradation detected');
  }
}
```

### 2. Enhanced Logger Service (Request Context)

```typescript
import { LoggerService } from '@/utils/logger.service';

export class MyController {
  constructor(private readonly logger: LoggerService) {}

  @Post()
  async create(@Body() data: CreateDto) {
    // Automatically includes request ID, user ID, method, path
    this.logger.log('Creating resource', {
      resourceType: 'project',
      data: data.name,
    });

    // Log API calls with duration
    const start = Date.now();
    const result = await this.apiService.call();
    this.logger.logApiCall('openai', 'completion', Date.now() - start, true);

    // Log business events
    this.logger.logBusinessEvent('project.created', {
      projectId: result.id,
      organizationId: result.organizationId,
    });

    // Log performance metrics
    this.logger.logPerformance('project.analysis', Date.now() - start);

    // Log security events
    this.logger.logSecurityEvent('unauthorized.access', 'medium', {
      resource: 'project',
      attemptedAction: 'delete',
    });
  }
}
```

### 3. Static Logger (Outside Request Context)

```typescript
import { StaticLoggerService } from '@/utils/logger.service';

export class BatchProcessor {
  private readonly logger = new StaticLoggerService(BatchProcessor.name);

  async processBatch() {
    this.logger.log('Starting batch processing', {
      batchId: 'batch_123',
      size: 100,
    });
  }
}
```

## Structured Log Format

Logs are structured in JSON format for easy querying in CloudWatch:

```json
{
  "timestamp": "2024-01-15 10:30:45.123",
  "level": "info",
  "message": "API call to openai",
  "context": "ProjectService",
  "metadata": {
    "service": "brandinsight-server",
    "environment": "production",
    "version": "1.0.0",
    "region": "eu-west-1",
    "requestId": "req_1234567890_abc123",
    "userId": "user_xyz",
    "method": "POST",
    "path": "/api/projects",
    "action": "api_call",
    "service": "openai",
    "duration": 1234,
    "success": true
  }
}
```

## CloudWatch Insights Queries

Use these example queries in CloudWatch Insights:

### 1. Find Slow API Calls
```
fields @timestamp, metadata.service, metadata.duration, @message
| filter metadata.action = "api_call" and metadata.duration > 5000
| sort @timestamp desc
```

### 2. Track User Activity
```
fields @timestamp, metadata.userId, metadata.method, metadata.path, @message
| filter metadata.userId = "user_xyz"
| sort @timestamp desc
```

### 3. Monitor Error Rates
```
stats count() by level
| filter level = "error" or level = "warn"
```

### 4. Find Security Events
```
fields @timestamp, metadata.event, metadata.severity, metadata.details
| filter metadata.action = "security_event"
| sort metadata.severity desc
```

### 5. Analyze Performance by Operation
```
stats avg(metadata.duration), max(metadata.duration), count() by metadata.operation
| filter metadata.action = "performance"
```

## Best Practices

1. **Use Structured Metadata**: Always include relevant context in metadata fields
   ```typescript
   this.logger.log('Processing started', {
     jobId: job.id,
     type: job.type,
     priority: job.priority,
   });
   ```

2. **Log at Appropriate Levels**:
   - `error`: Application errors that need immediate attention
   - `warn`: Performance issues, deprecated usage, recoverable errors
   - `info`: Important business events, API calls, state changes
   - `debug`: Detailed execution flow, variable values
   - `verbose`: Very detailed debugging information

3. **Include Timing Information**:
   ```typescript
   const start = Date.now();
   // ... operation ...
   this.logger.log('Operation completed', {
     duration: Date.now() - start,
   });
   ```

4. **Avoid Logging Sensitive Data**:
   - Never log passwords, API keys, or tokens
   - Be careful with personally identifiable information (PII)
   - Sanitize user input before logging

5. **Use Request Context**: Inject LoggerService for automatic request context

6. **Log Business Events**: Track important business metrics
   ```typescript
   this.logger.logBusinessEvent('subscription.upgraded', {
     from: 'free',
     to: 'pro',
     mrr_change: 49,
   });
   ```

## Monitoring and Alerting

Set up CloudWatch alarms for:

1. **Error Rate**: Alert when error count exceeds threshold
2. **Response Time**: Alert when average duration exceeds SLA
3. **Security Events**: Alert on high-severity security events
4. **Business Metrics**: Track key business KPIs from logs

## Cost Optimization

1. **Log Retention**: Set appropriate retention periods (e.g., 30 days)
2. **Log Levels**: Use `info` level in production to reduce volume
3. **Sampling**: Consider sampling verbose logs in high-traffic scenarios
4. **Compression**: CloudWatch automatically compresses logs

## Troubleshooting

1. **Logs Not Appearing**: Check IAM permissions for ECS task execution role
2. **Missing Metadata**: Ensure LoggerService is properly injected
3. **Performance Issues**: Check buffer size and non-blocking mode
4. **Format Issues**: Verify LOG_FORMAT environment variable

## Migration Guide

To migrate existing code to use enhanced logging:

1. Replace `console.log` with `Logger` instances
2. Add metadata to important log statements
3. Use LoggerService in controllers for request context
4. Implement structured logging for API calls and business events