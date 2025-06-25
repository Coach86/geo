import { Injectable, Logger, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { Request } from 'express';

interface LogContext {
  userId?: string;
  organizationId?: string;
  projectId?: string;
  requestId?: string;
  action?: string;
  duration?: number;
  [key: string]: any;
}

@Injectable({ scope: Scope.REQUEST })
export class LoggerService extends Logger {
  private requestId: string;

  constructor(@Inject(REQUEST) private request: Request) {
    super();
    // Generate or extract request ID
    this.requestId = this.request?.headers['x-request-id'] as string || 
                     this.request?.headers['x-amzn-trace-id'] as string ||
                     this.generateRequestId();
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private enrichContext(context?: LogContext): LogContext {
    const enriched: LogContext = {
      requestId: this.requestId,
      ...context,
    };

    // Add user context if available
    if (this.request && (this.request as any).userId) {
      enriched.userId = (this.request as any).userId;
    }

    // Add request metadata
    if (this.request) {
      enriched.method = this.request.method;
      enriched.path = this.request.path;
      enriched.ip = this.request.ip || this.request.headers['x-forwarded-for'];
      enriched.userAgent = this.request.headers['user-agent'];
    }

    return enriched;
  }

  log(message: any, ...optionalParams: any[]) {
    const context = typeof optionalParams[0] === 'object' ? optionalParams[0] : {};
    const enrichedContext = this.enrichContext(context);
    super.log(message, JSON.stringify(enrichedContext));
  }

  error(message: any, stack?: string, context?: string) {
    const contextObj = context ? { context } : {};
    const enrichedContext = this.enrichContext(contextObj);
    super.error(message, stack, JSON.stringify(enrichedContext));
  }

  warn(message: any, context?: string) {
    const contextObj = context ? { context } : {};
    const enrichedContext = this.enrichContext(contextObj);
    super.warn(message, JSON.stringify(enrichedContext));
  }

  debug(message: any, context?: string) {
    const contextObj = context ? { context } : {};
    const enrichedContext = this.enrichContext(contextObj);
    super.debug(message, JSON.stringify(enrichedContext));
  }

  verbose(message: any, context?: string) {
    const contextObj = context ? { context } : {};
    const enrichedContext = this.enrichContext(contextObj);
    super.verbose(message, JSON.stringify(enrichedContext));
  }

  // Specific logging methods for common operations
  logApiCall(service: string, method: string, duration: number, success: boolean, context?: LogContext) {
    this.log(`API call to ${service}`, {
      ...context,
      action: 'api_call',
      service,
      method,
      duration,
      success,
    });
  }

  logDatabaseOperation(operation: string, collection: string, duration: number, success: boolean, context?: LogContext) {
    this.log(`Database ${operation} on ${collection}`, {
      ...context,
      action: 'db_operation',
      operation,
      collection,
      duration,
      success,
    });
  }

  logBusinessEvent(event: string, data: any, context?: LogContext) {
    this.log(`Business event: ${event}`, {
      ...context,
      action: 'business_event',
      event,
      eventData: data,
    });
  }

  logPerformance(operation: string, duration: number, context?: LogContext) {
    const logData = {
      ...context,
      action: 'performance',
      operation,
      duration,
      slow: duration > 5000,
    };
    
    if (duration > 5000) {
      this.warn(`Performance: ${operation} took ${duration}ms`, JSON.stringify(logData));
    } else {
      this.log(`Performance: ${operation} took ${duration}ms`, logData);
    }
  }

  logSecurityEvent(event: string, severity: 'low' | 'medium' | 'high', details: any, context?: LogContext) {
    const logData = {
      ...context,
      action: 'security_event',
      event,
      severity,
      details,
    };
    
    if (severity === 'high') {
      this.error(`Security event: ${event}`, undefined, JSON.stringify(logData));
    } else if (severity === 'medium') {
      this.warn(`Security event: ${event}`, JSON.stringify(logData));
    } else {
      this.log(`Security event: ${event}`, logData);
    }
  }
}

// Static logger for use outside of request context
export class StaticLoggerService {
  private logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  log(message: string, metadata?: any) {
    this.logger.log(message, metadata);
  }

  error(message: string, trace?: string, metadata?: any) {
    this.logger.error(message, trace, metadata);
  }

  warn(message: string, metadata?: any) {
    this.logger.warn(message, metadata);
  }

  debug(message: string, metadata?: any) {
    this.logger.debug(message, metadata);
  }

  verbose(message: string, metadata?: any) {
    this.logger.verbose(message, metadata);
  }
}