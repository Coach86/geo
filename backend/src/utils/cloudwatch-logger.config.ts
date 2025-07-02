import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

interface LogMetadata {
  service?: string;
  environment?: string;
  version?: string;
  requestId?: string;
  userId?: string;
  organizationId?: string;
  projectId?: string;
  [key: string]: any;
}

// Custom format for CloudWatch that includes structured metadata
const cloudWatchFormat = winston.format.printf(({ level, message, timestamp, context, trace, ...meta }) => {
  const log: any = {
    timestamp,
    level,
    message: typeof message === 'string' ? message : JSON.stringify(message),
    context,
  };

  // Add trace if present (for errors) - ensure it's a single line
  if (trace) {
    log.trace = typeof trace === 'string' ? trace.replace(/\n/g, ' ') : trace;
  }

  // Add all metadata
  if (Object.keys(meta).length > 0) {
    log.metadata = meta;
  }

  // Ensure the entire log is on a single line
  return JSON.stringify(log, null, 0);
});

// Format for adding default metadata to all logs
const defaultMetadata = winston.format((info) => {
  info.service = process.env.SERVICE_NAME || 'brandinsight-server';
  info.environment = process.env.NODE_ENV || 'development';
  info.version = process.env.APP_VERSION || '1.0.0';
  info.region = process.env.AWS_REGION || 'eu-west-1';
  return info;
});

export const getCloudWatchLoggerConfig = (
  environment: string,
  appName: string,
): WinstonModuleOptions => {
  const isProduction = environment === 'production';
  const enableCloudWatch = process.env.ENABLE_CLOUDWATCH_LOGS === 'true';
  const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');
  const logFormat = process.env.LOG_FORMAT || 'json';

  const transports: winston.transport[] = [];

  // Console Transport for CloudWatch
  if (enableCloudWatch || isProduction) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.errors({ stack: true }),
          // Ensure errors are also single-line
          winston.format((info) => {
            if (info.stack && typeof info.stack === 'string') {
              info.stack = info.stack.replace(/\n/g, ' ');
            }
            return info;
          })(),
          defaultMetadata(),
          winston.format.ms(),
          // Always use JSON format in production/CloudWatch to ensure single-line logs
          cloudWatchFormat
        ),
      }),
    );
  } else {
    // Development console transport with colors
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike(appName, {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    );
  }

  // File transports for local development/debugging
  if (!isProduction && process.env.ENABLE_FILE_LOGS === 'true') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );
  }

  return {
    transports,
    level: logLevel,
    // Add default metadata to all logs
    defaultMeta: {
      service: process.env.SERVICE_NAME || 'brandinsight-server',
    },
    // Handle exceptions and rejections
    exitOnError: false,
    handleExceptions: true,
    handleRejections: true,
  };
};

// Helper class for structured logging with context
export class CloudWatchLogger {
  private context: string;
  private metadata: LogMetadata;

  constructor(context: string, metadata?: LogMetadata) {
    this.context = context;
    this.metadata = metadata || {};
  }

  log(message: string, meta?: LogMetadata) {
    return {
      message,
      context: this.context,
      ...this.metadata,
      ...meta,
    };
  }

  error(message: string, trace?: string, meta?: LogMetadata) {
    return {
      message,
      context: this.context,
      trace,
      ...this.metadata,
      ...meta,
    };
  }

  warn(message: string, meta?: LogMetadata) {
    return {
      message,
      context: this.context,
      ...this.metadata,
      ...meta,
    };
  }

  debug(message: string, meta?: LogMetadata) {
    return {
      message,
      context: this.context,
      ...this.metadata,
      ...meta,
    };
  }

  verbose(message: string, meta?: LogMetadata) {
    return {
      message,
      context: this.context,
      ...this.metadata,
      ...meta,
    };
  }
}