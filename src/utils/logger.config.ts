import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';

export const getWinstonConfig = (
  environment: string,
  appName: string,
): WinstonModuleOptions => {
  const isProduction = environment === 'production';

  const transports: winston.transport[] = [
    // Console Transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike(appName, {
          colors: !isProduction,
          prettyPrint: !isProduction,
        }),
      ),
    }),
  ];

  // Add file transports in production
  if (isProduction) {
    // Add a file transport for all logs
    transports.push(
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );

    // Add a file transport for error logs
    transports.push(
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
    // Log everything in development, only warnings and errors in production
    level: isProduction ? 'warn' : 'debug',
  };
};