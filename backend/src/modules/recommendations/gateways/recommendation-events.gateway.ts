import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RecommendationService } from '../services/recommendation.service';

@WebSocketGateway({
  namespace: 'recommendations',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})
export class RecommendationEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RecommendationEventsGateway.name);
  private readonly projectRooms = new Map<string, Set<string>>();

  constructor(private readonly recommendationService: RecommendationService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    this.projectRooms.forEach((clients, projectId) => {
      if (clients.has(client.id)) {
        clients.delete(client.id);
        client.leave(`project:${projectId}`);
      }
    });
  }

  @SubscribeMessage('subscribeToProject')
  async handleProjectSubscription(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { projectId } = data;
    const room = `project:${projectId}`;

    client.join(room);
    
    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, new Set());
    }
    this.projectRooms.get(projectId)!.add(client.id);

    this.logger.log(`Client ${client.id} subscribed to project ${projectId}`);

    // TODO: Fix - client.data.organizationId is not available, need to get from project
    const summary = await this.recommendationService.getProjectSummary(
      projectId,
      'temp-org-id', // Temporary fix - this will be handled properly later
    );

    client.emit('projectSummary', {
      projectId,
      summary,
    });
  }

  @SubscribeMessage('unsubscribeFromProject')
  handleProjectUnsubscription(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { projectId } = data;
    const room = `project:${projectId}`;

    client.leave(room);
    
    if (this.projectRooms.has(projectId)) {
      this.projectRooms.get(projectId)!.delete(client.id);
    }

    this.logger.log(`Client ${client.id} unsubscribed from project ${projectId}`);
  }

  emitRecommendationCreated(projectId: string, recommendation: any) {
    const room = `project:${projectId}`;
    
    this.server.to(room).emit('recommendationCreated', {
      projectId,
      recommendation,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Emitted recommendationCreated for project ${projectId}`,
    );
  }

  emitRecommendationUpdated(projectId: string, recommendation: any) {
    const room = `project:${projectId}`;
    
    this.server.to(room).emit('recommendationUpdated', {
      projectId,
      recommendation,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Emitted recommendationUpdated for project ${projectId}`,
    );
  }

  emitAnalysisStarted(projectId: string) {
    const room = `project:${projectId}`;
    
    this.server.to(room).emit('analysisStarted', {
      projectId,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Emitted analysisStarted for project ${projectId}`,
    );
  }

  emitAnalysisProgress(
    projectId: string,
    progress: {
      currentAnalyzer: string;
      analyzersCompleted: number;
      totalAnalyzers: number;
      candidatesFound: number;
    },
  ) {
    const room = `project:${projectId}`;
    
    this.server.to(room).emit('analysisProgress', {
      projectId,
      progress,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Emitted analysisProgress for project ${projectId}: ${progress.currentAnalyzer}`,
    );
  }

  emitAnalysisCompleted(
    projectId: string,
    result: {
      recommendationsGenerated: number;
      executionTime: number;
    },
  ) {
    const room = `project:${projectId}`;
    
    this.server.to(room).emit('analysisCompleted', {
      projectId,
      result,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Emitted analysisCompleted for project ${projectId}: ${result.recommendationsGenerated} recommendations`,
    );
  }

  emitBatchAnalysisStarted(batchExecutionId: string) {
    this.server.emit('batchAnalysisStarted', {
      batchExecutionId,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Emitted batchAnalysisStarted for batch ${batchExecutionId}`,
    );
  }

  emitBatchAnalysisCompleted(
    batchExecutionId: string,
    result: {
      projectsAnalyzed: number;
      totalRecommendations: number;
    },
  ) {
    this.server.emit('batchAnalysisCompleted', {
      batchExecutionId,
      result,
      timestamp: new Date(),
    });

    this.logger.debug(
      `Emitted batchAnalysisCompleted for batch ${batchExecutionId}`,
    );
  }
}