import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';

export interface CrawlerEvent {
  projectId: string;
  url?: string;
  crawledPages?: number;
  totalPages?: number;
  progress?: number;
  status?: string;
  error?: string;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/api/socket-io/',
})
export class CrawlerEventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('CrawlerEventsGateway');
  private clientProjects: Map<string, string> = new Map(); // clientId -> projectId

  afterInit(server: Server) {
    this.logger.log('Socket.IO gateway initialized for crawler events');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientProjects.delete(client.id);
  }

  @SubscribeMessage('subscribe_crawler')
  handleSubscribeCrawler(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(`Client ${client.id} subscribed to crawler events for project ${data.projectId}`);
    this.clientProjects.set(client.id, data.projectId);
    client.join(`crawler-${data.projectId}`);
  }

  @SubscribeMessage('unsubscribe_crawler')
  handleUnsubscribeCrawler(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ): void {
    this.logger.log(`Client ${client.id} unsubscribed from crawler events for project ${data.projectId}`);
    this.clientProjects.delete(client.id);
    client.leave(`crawler-${data.projectId}`);
  }

  @OnEvent('crawler.started')
  handleCrawlerStarted(payload: any) {
    const event: CrawlerEvent = {
      projectId: payload.projectId,
      totalPages: payload.maxPages || 100,
      crawledPages: 0,
      progress: 0,
      status: 'started',
      timestamp: new Date(),
    };
    
    this.logger.log(`[CRAWLER] Emitting crawler.started event for project ${payload.projectId}`);
    this.server.to(`crawler-${payload.projectId}`).emit('crawler.started', event);
  }

  @OnEvent('crawler.progress')
  handleCrawlerProgress(payload: any) {
    const event: CrawlerEvent = {
      projectId: payload.projectId,
      url: payload.currentUrl,
      crawledPages: payload.crawled || 0,
      totalPages: payload.total || 100,
      progress: payload.total > 0 ? Math.round((payload.crawled / payload.total) * 100) : 0,
      status: 'crawling',
      timestamp: new Date(),
    };
    
    this.logger.log(`[CRAWLER] Emitting crawler.progress event - ${payload.crawled}/${payload.total}`);
    this.server.to(`crawler-${payload.projectId}`).emit('crawler.progress', event);
  }

  @OnEvent('crawler.page_crawled')
  handlePageCrawled(payload: any) {
    const event: CrawlerEvent = {
      projectId: payload.projectId,
      url: payload.url,
      crawledPages: payload.crawled || 0,
      totalPages: payload.total || 100,
      progress: payload.total > 0 ? Math.round((payload.crawled / payload.total) * 100) : 0,
      status: 'crawling',
      timestamp: new Date(),
    };
    
    this.logger.log(`[CRAWLER] Emitting page_crawled event for ${payload.url}`);
    this.server.to(`crawler-${payload.projectId}`).emit('page_crawled', event);
  }

  @OnEvent('crawler.completed')
  handleCrawlerCompleted(payload: any) {
    const event: CrawlerEvent = {
      projectId: payload.projectId,
      crawledPages: payload.crawled || 0,
      totalPages: payload.total || 0,
      progress: 100,
      status: 'completed',
      timestamp: new Date(),
    };
    
    this.logger.log(`[CRAWLER] Emitting crawler.completed event for project ${payload.projectId}`);
    this.server.to(`crawler-${payload.projectId}`).emit('crawler.completed', event);
  }

  @OnEvent('crawler.failed')
  handleCrawlerFailed(payload: any) {
    const event: CrawlerEvent = {
      projectId: payload.projectId,
      error: payload.error || 'Unknown error',
      status: 'failed',
      timestamp: new Date(),
    };
    
    this.logger.log(`[CRAWLER] Emitting crawler.failed event for project ${payload.projectId}`);
    this.server.to(`crawler-${payload.projectId}`).emit('crawler.failed', event);
  }

  @OnEvent('analyzer.started')
  handleAnalyzerStarted(payload: any) {
    const event: CrawlerEvent = {
      projectId: payload.projectId,
      totalPages: payload.totalPages || 100,
      crawledPages: 0, // Analysis starting, reset for progress tracking
      progress: 0,
      status: 'analyzing',
      timestamp: new Date(),
    };
    
    this.logger.log(`[ANALYZER] Emitting analysis started event for project ${payload.projectId}`);
    this.server.to(`crawler-${payload.projectId}`).emit('crawler.progress', event);
  }

  @OnEvent('analyzer.progress')
  handleAnalyzerProgress(payload: any) {
    const event: CrawlerEvent = {
      projectId: payload.projectId,
      url: payload.currentUrl,
      crawledPages: payload.analyzed || 0,
      totalPages: payload.total || 100,
      progress: payload.total > 0 ? Math.round((payload.analyzed / payload.total) * 100) : 0,
      status: 'analyzing',
      timestamp: new Date(),
    };
    
    this.logger.log(`[ANALYZER] Progress update for project ${payload.projectId}: ${payload.analyzed}/${payload.total}`);
    this.server.to(`crawler-${payload.projectId}`).emit('crawler.progress', event);
  }

  @OnEvent('analyzer.completed')
  handleAnalyzerCompleted(payload: any) {
    const event: CrawlerEvent = {
      projectId: payload.projectId,
      crawledPages: payload.analyzed || 0,
      totalPages: payload.total || 0,
      progress: 100,
      status: 'analysis_completed',
      timestamp: new Date(),
    };
    
    this.logger.log(`[ANALYZER] Emitting analysis completed event for project ${payload.projectId}`);
    this.server.to(`crawler-${payload.projectId}`).emit('crawler.completed', event);
  }
}