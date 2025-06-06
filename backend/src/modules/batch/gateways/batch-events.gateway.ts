import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface BatchEvent {
  batchExecutionId: string;
  projectId: string;
  projectName: string;
  eventType:
    | 'batch_started'
    | 'pipeline_started'
    | 'pipeline_completed'
    | 'pipeline_failed'
    | 'batch_completed'
    | 'batch_failed';
  pipelineType?: 'spontaneous' | 'sentiment' | 'comparison' | 'accuracy' | 'full';
  message: string;
  timestamp: Date;
  progress?: number; // 0-100
  error?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/api/socket-io/',
  namespace: '/batch-events',
})
export class BatchEventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('BatchEventsGateway');

  afterInit(server: Server) {
    this.logger.log('Socket.IO gateway initialized for batch events');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Emit a batch event to all connected clients
   */
  emitBatchEvent(event: BatchEvent) {
    this.logger.log(`Emitting batch event: ${event.eventType} for batch ${event.batchExecutionId}`);
    this.server.emit('batch_event', event);
  }

  /**
   * Emit batch started event
   */
  emitBatchStarted(
    batchExecutionId: string,
    projectId: string,
    projectName: string,
    pipelineType: string,
  ) {
    const event: BatchEvent = {
      batchExecutionId,
      projectId,
      projectName,
      eventType: 'batch_started',
      pipelineType: pipelineType as any,
      message: `Started ${pipelineType} analysis for ${projectName}`,
      timestamp: new Date(),
      progress: 0,
    };
    this.emitBatchEvent(event);
  }

  /**
   * Emit pipeline started event
   */
  emitPipelineStarted(
    batchExecutionId: string,
    projectId: string,
    projectName: string,
    pipelineType: string,
  ) {
    const event: BatchEvent = {
      batchExecutionId,
      projectId,
      projectName,
      eventType: 'pipeline_started',
      pipelineType: pipelineType as any,
      message: `Processing ${pipelineType} pipeline for ${projectName}`,
      timestamp: new Date(),
      progress: 25,
    };
    this.emitBatchEvent(event);
  }

  /**
   * Emit pipeline completed event
   */
  emitPipelineCompleted(
    batchExecutionId: string,
    projectId: string,
    projectName: string,
    pipelineType: string,
  ) {
    const event: BatchEvent = {
      batchExecutionId,
      projectId,
      projectName,
      eventType: 'pipeline_completed',
      pipelineType: pipelineType as any,
      message: `Completed ${pipelineType} pipeline for ${projectName}`,
      timestamp: new Date(),
      progress: 75,
    };
    this.emitBatchEvent(event);
  }

  /**
   * Emit pipeline failed event
   */
  emitPipelineFailed(
    batchExecutionId: string,
    projectId: string,
    projectName: string,
    pipelineType: string,
    error: string,
  ) {
    const event: BatchEvent = {
      batchExecutionId,
      projectId,
      projectName,
      eventType: 'pipeline_failed',
      pipelineType: pipelineType as any,
      message: `Failed ${pipelineType} pipeline for ${projectName}`,
      timestamp: new Date(),
      error,
    };
    this.emitBatchEvent(event);
  }

  /**
   * Emit batch completed event
   */
  emitBatchCompleted(
    batchExecutionId: string,
    projectId: string,
    projectName: string,
    pipelineType: string,
  ) {
    const event: BatchEvent = {
      batchExecutionId,
      projectId,
      projectName,
      eventType: 'batch_completed',
      pipelineType: pipelineType as any,
      message: `Successfully completed ${pipelineType} analysis for ${projectName}`,
      timestamp: new Date(),
      progress: 100,
    };
    this.emitBatchEvent(event);
  }

  /**
   * Emit batch failed event
   */
  emitBatchFailed(
    batchExecutionId: string,
    projectId: string,
    projectName: string,
    pipelineType: string,
    error: string,
  ) {
    const event: BatchEvent = {
      batchExecutionId,
      projectId,
      projectName,
      eventType: 'batch_failed',
      pipelineType: pipelineType as any,
      message: `Failed ${pipelineType} analysis for ${projectName}`,
      timestamp: new Date(),
      error,
    };
    this.emitBatchEvent(event);
  }
  
  // AI Visibility Scanner Events
  
  /**
   * Emit crawl progress event
   */
  emitCrawlProgress(
    projectId: string,
    data: {
      processed: number;
      failed: number;
      total: number;
      currentUrl?: string;
      queueSize?: number;
    },
  ) {
    this.logger.log(`Emitting crawl progress for project ${projectId}`);
    this.server.emit('aiVisibility:crawl:progress', {
      projectId,
      ...data,
      timestamp: new Date(),
    });
  }
  
  /**
   * Emit crawl completed event
   */
  emitCrawlCompleted(projectId: string, result: any) {
    this.logger.log(`Emitting crawl completed for project ${projectId}`);
    this.server.emit('aiVisibility:crawl:completed', {
      projectId,
      result,
      timestamp: new Date(),
    });
  }
  
  /**
   * Emit index build progress event
   */
  emitIndexBuildProgress(
    projectId: string,
    data: {
      indexType: 'bm25' | 'vector';
      progress: number;
      status: string;
    },
  ) {
    this.logger.log(`Emitting index build progress for project ${projectId}`);
    this.server.emit('aiVisibility:index:progress', {
      projectId,
      ...data,
      timestamp: new Date(),
    });
  }
  
  /**
   * Emit index build completed event
   */
  emitIndexBuildCompleted(
    projectId: string,
    data: {
      indexType: 'bm25' | 'vector';
      indexId: string;
    },
  ) {
    this.logger.log(`Emitting index build completed for project ${projectId}`);
    this.server.emit('aiVisibility:index:completed', {
      projectId,
      ...data,
      timestamp: new Date(),
    });
  }
  
  /**
   * Emit scan progress event
   */
  emitScanProgress(
    projectId: string,
    data: {
      scanId: string;
      progress: number;
      currentQuery?: string;
      totalQueries: number;
    },
  ) {
    this.logger.log(`Emitting scan progress for project ${projectId}`);
    this.server.emit('aiVisibility:scan:progress', {
      projectId,
      ...data,
      timestamp: new Date(),
    });
  }
  
  /**
   * Emit scan completed event
   */
  emitScanCompleted(projectId: string, scanId: string) {
    this.logger.log(`Emitting scan completed for project ${projectId}`);
    this.server.emit('aiVisibility:scan:completed', {
      projectId,
      scanId,
      timestamp: new Date(),
    });
  }

  /**
   * Emit audit started event
   */
  emitAuditStarted(
    projectId: string,
    data: {
      forceRecrawl?: boolean;
      deepAnalysis?: boolean;
    },
  ) {
    this.logger.log(`Emitting audit started for project ${projectId}`);
    this.server.emit('aiVisibility:audit:started', {
      projectId,
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Emit audit completed event
   */
  emitAuditCompleted(
    projectId: string,
    data: {
      scanId: string;
      duration: number;
      crawledPages: number;
    },
  ) {
    this.logger.log(`Emitting audit completed for project ${projectId}`);
    this.server.emit('aiVisibility:audit:completed', {
      projectId,
      ...data,
      timestamp: new Date(),
    });
  }

  /**
   * Emit audit failed event
   */
  emitAuditFailed(projectId: string, error: string) {
    this.logger.log(`Emitting audit failed for project ${projectId}`);
    this.server.emit('aiVisibility:audit:failed', {
      projectId,
      error,
      timestamp: new Date(),
    });
  }
}
