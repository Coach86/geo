import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { ReportCompletedEvent } from '../events/report-completed.event';

export interface UserNotificationEvent {
  userId: string;
  projectId: string;
  projectName: string;
  reportId: string;
  eventType: 'report_completed';
  triggerType: 'manual' | 'cron' | 'new_project';
  message: string;
  timestamp: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/api/socket-io/',
  namespace: '/user-notifications',
})
export class UserNotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('UserNotificationsGateway');
  private userSocketMap: Map<string, string[]> = new Map(); // userId -> socketIds[]

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('[UserNotificationsGateway] WebSocket gateway initialized');
    this.logger.log('[UserNotificationsGateway] Namespace: /user-notifications');
    this.logger.log('[UserNotificationsGateway] Path: /api/socket-io/');
  }

  async handleConnection(client: Socket) {
    try {
      // Extract token from query params or authorization header
      const token = this.extractToken(client);
      this.logger.log(`[UserNotificationsGateway] Client ${client.id} attempting connection, token: ${token ? 'present' : 'missing'}`);

      if (!token) {
        this.logger.error(`[UserNotificationsGateway] Client ${client.id} - No token provided`);
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.verifyToken(token);
      this.logger.log(`[UserNotificationsGateway] Token verification result:`, payload ? 'valid' : 'invalid');

      if (!payload || !payload.sub) {
        this.logger.error(`[UserNotificationsGateway] Client ${client.id} - Invalid token or missing sub`);
        client.disconnect();
        return;
      }

      const userId = payload.sub;
      this.logger.log(`[UserNotificationsGateway] Authenticated user ${userId} on socket ${client.id}`);

      // Store user-socket mapping
      if (!this.userSocketMap.has(userId)) {
        this.userSocketMap.set(userId, []);
      }
      this.userSocketMap.get(userId)!.push(client.id);

      // Store userId in socket data for later use
      client.data.userId = userId;

      this.logger.log(`Client connected: ${client.id} for user: ${userId}`);

      // Send connection success event
      client.emit('connected', {
        message: 'Connected to notification service',
        userId,
      });
    } catch (error) {
      this.logger.error(`Connection error for client ${client.id}: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId && this.userSocketMap.has(userId)) {
      const sockets = this.userSocketMap.get(userId)!;
      const index = sockets.indexOf(client.id);
      if (index > -1) {
        sockets.splice(index, 1);
      }
      if (sockets.length === 0) {
        this.userSocketMap.delete(userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Listen for report completed events and notify the user
   */
  @OnEvent('report.completed')
  async handleReportCompleted(event: ReportCompletedEvent) {
    this.logger.log(`[UserNotificationsGateway] Received report.completed event for user ${event.userId}, project ${event.projectId}`);

    const notification: UserNotificationEvent = {
      userId: event.userId,
      projectId: event.projectId,
      projectName: event.brandName,
      reportId: event.reportId,
      eventType: 'report_completed',
      triggerType: event.triggerType,
      message: `Your brand analysis for ${event.brandName} is ready!`,
      timestamp: new Date(),
    };

    // Log current connected users
    this.logger.log(`[UserNotificationsGateway] Currently connected users: ${Array.from(this.userSocketMap.keys()).join(', ')}`);

    // Send notification to all connected sockets for this user
    const userSockets = this.userSocketMap.get(event.userId);
    if (userSockets && userSockets.length > 0) {
      this.logger.log(`[UserNotificationsGateway] Sending notification to user ${event.userId} (${userSockets.length} connections)`);

      for (const socketId of userSockets) {
        this.logger.log(`[UserNotificationsGateway] Emitting to socket ${socketId}`);
        this.server.to(socketId).emit('notification', notification);
      }
    } else {
      this.logger.log(`[UserNotificationsGateway] No active connections for user ${event.userId}, notification will be sent via email only`);
    }
  }

  /**
   * Handle subscription to project-specific notifications
   */
  @SubscribeMessage('subscribe_project')
  async handleSubscribeProject(
    @MessageBody() data: { projectId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    if (!userId) {
      throw new WsException('Unauthorized');
    }

    // Join room for project-specific notifications
    client.join(`project:${data.projectId}`);
    this.logger.log(`User ${userId} subscribed to project ${data.projectId} notifications`);

    return {
      event: 'subscribed',
      data: {
        projectId: data.projectId,
        message: 'Successfully subscribed to project notifications',
      },
    };
  }

  /**
   * Extract token from socket connection
   */
  private extractToken(client: Socket): string | null {
    // Try query params first (common for WebSocket connections)
    if (client.handshake.query.token) {
      return client.handshake.query.token as string;
    }

    // Try authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<any> {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      return await this.jwtService.verifyAsync(token, { secret });
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Send notification to specific user
   */
  public sendNotificationToUser(userId: string, notification: Partial<UserNotificationEvent>) {
    const userSockets = this.userSocketMap.get(userId);
    if (userSockets && userSockets.length > 0) {
      for (const socketId of userSockets) {
        this.server.to(socketId).emit('notification', {
          ...notification,
          timestamp: new Date(),
        });
      }
    }
  }
}
