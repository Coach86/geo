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
}
