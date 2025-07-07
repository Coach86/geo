import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface PageMagicEvent {
  jobId: string;
  projectId: string;
  pageUrl: string;
  eventType:
    | 'job_created'
    | 'iteration_started'
    | 'iteration_completed'
    | 'score_calculated'
    | 'improvement_generated'
    | 'job_completed'
    | 'job_failed'
    | 'rules_list_generated'
    | 'rule_fix_started'
    | 'rule_fix_completed'
    | 'rule_fix_failed'
    | 'rule_fix_retrying';
  iteration?: number;
  maxIterations?: number;
  message: string;
  timestamp: Date;
  progress?: number; // 0-100
  scoreData?: {
    before: number;
    after: number;
    improvement: number;
  };
  error?: string;
  ruleData?: {
    rule: any;
    ruleIndex: number;
    totalRules: number;
    result?: any;
    retryCount?: number;
    maxRetries?: number;
  };
  rulesData?: any[];
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: '/api/socket-io/',
  namespace: '/page-magic-events',
})
export class PageMagicEventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('PageMagicEventsGateway');

  afterInit(server: Server) {
    this.logger.log('Socket.IO gateway initialized for Page Magic events');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected to Page Magic events: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from Page Magic events: ${client.id}`);
  }

  /**
   * Emit a Page Magic event to all connected clients
   */
  emitPageMagicEvent(event: PageMagicEvent) {
    this.logger.log(`Emitting Page Magic event: ${event.eventType} for job ${event.jobId}`);
    this.server.emit('page_magic_event', event);
  }

  /**
   * Emit job created event
   */
  emitJobCreated(
    jobId: string,
    projectId: string,
    pageUrl: string,
    maxIterations: number,
  ) {
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'job_created',
      maxIterations,
      message: `Started content improvement for ${new URL(pageUrl).hostname}`,
      timestamp: new Date(),
      progress: 0,
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit iteration started event
   */
  emitIterationStarted(
    jobId: string,
    projectId: string,
    pageUrl: string,
    iteration: number,
    maxIterations: number,
  ) {
    const progress = ((iteration - 1) / maxIterations) * 100;
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'iteration_started',
      iteration,
      maxIterations,
      message: `Starting iteration ${iteration} of ${maxIterations}`,
      timestamp: new Date(),
      progress,
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit score calculated event
   */
  emitScoreCalculated(
    jobId: string,
    projectId: string,
    pageUrl: string,
    iteration: number,
    scoreBefore: number,
    scoreAfter: number,
  ) {
    const improvement = scoreAfter - scoreBefore;
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'score_calculated',
      iteration,
      message: `Score improved from ${scoreBefore} to ${scoreAfter} (+${improvement})`,
      timestamp: new Date(),
      scoreData: {
        before: scoreBefore,
        after: scoreAfter,
        improvement,
      },
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit improvement generated event
   */
  emitImprovementGenerated(
    jobId: string,
    projectId: string,
    pageUrl: string,
    iteration: number,
    issuesFound: number,
  ) {
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'improvement_generated',
      iteration,
      message: `Generated improvements addressing ${issuesFound} issues`,
      timestamp: new Date(),
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit iteration completed event
   */
  emitIterationCompleted(
    jobId: string,
    projectId: string,
    pageUrl: string,
    iteration: number,
    maxIterations: number,
    currentScore: number,
  ) {
    const progress = (iteration / maxIterations) * 100;
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'iteration_completed',
      iteration,
      maxIterations,
      message: `Completed iteration ${iteration} - Current score: ${currentScore}`,
      timestamp: new Date(),
      progress,
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit job completed event
   */
  emitJobCompleted(
    jobId: string,
    projectId: string,
    pageUrl: string,
    iterations: number,
    finalScore: number,
    originalScore: number,
  ) {
    const totalImprovement = finalScore - originalScore;
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'job_completed',
      message: `Content improvement completed after ${iterations} iterations. Total improvement: +${totalImprovement} points`,
      timestamp: new Date(),
      progress: 100,
      scoreData: {
        before: originalScore,
        after: finalScore,
        improvement: totalImprovement,
      },
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit job failed event
   */
  emitJobFailed(
    jobId: string,
    projectId: string,
    pageUrl: string,
    error: string,
  ) {
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'job_failed',
      message: `Content improvement failed: ${error}`,
      timestamp: new Date(),
      error,
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit rules list generated event
   */
  emitRulesListGenerated(
    jobId: string,
    projectId: string,
    pageUrl: string,
    rules: any[]
  ) {
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'rules_list_generated',
      message: `Found ${rules.length} rules to process`,
      timestamp: new Date(),
      rulesData: rules,
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit rule fix started event
   */
  emitRuleFixStarted(
    jobId: string,
    projectId: string,
    pageUrl: string,
    rule: any,
    ruleIndex: number,
    totalRules: number
  ) {
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'rule_fix_started',
      message: `Processing rule ${ruleIndex}/${totalRules}: ${rule.description}`,
      timestamp: new Date(),
      progress: ((ruleIndex - 1) / totalRules) * 100,
      ruleData: {
        rule,
        ruleIndex,
        totalRules,
      },
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit rule fix completed event
   */
  emitRuleFixCompleted(
    jobId: string,
    projectId: string,
    pageUrl: string,
    rule: any,
    result: any,
    scoreBefore: number,
    scoreAfter: number,
    ruleIndex: number,
    totalRules: number
  ) {
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'rule_fix_completed',
      message: `Completed rule ${ruleIndex}/${totalRules}: Score ${scoreBefore} → ${scoreAfter}`,
      timestamp: new Date(),
      progress: (ruleIndex / totalRules) * 100,
      scoreData: {
        before: scoreBefore,
        after: scoreAfter,
        improvement: scoreAfter - scoreBefore,
      },
      ruleData: {
        rule,
        ruleIndex,
        totalRules,
        result,
      },
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit rule fix failed event
   */
  emitRuleFixFailed(
    jobId: string,
    projectId: string,
    pageUrl: string,
    rule: any,
    error: string,
    ruleIndex: number,
    totalRules: number
  ) {
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'rule_fix_failed',
      message: `Failed to process rule ${ruleIndex}/${totalRules}: ${error}`,
      timestamp: new Date(),
      error,
      ruleData: {
        rule,
        ruleIndex,
        totalRules,
      },
    };
    this.emitPageMagicEvent(event);
  }

  /**
   * Emit rule retrying event
   */
  emitRuleRetrying(
    jobId: string,
    projectId: string,
    pageUrl: string,
    rule: any,
    retryCount: number,
    maxRetries: number,
    ruleIndex: number,
    totalRules: number
  ) {
    const event: PageMagicEvent = {
      jobId,
      projectId,
      pageUrl,
      eventType: 'rule_fix_retrying',
      message: `Retrying rule ${ruleIndex}/${totalRules} (attempt ${retryCount}/${maxRetries}): Score did not improve`,
      timestamp: new Date(),
      ruleData: {
        rule,
        ruleIndex,
        totalRules,
        retryCount,
        maxRetries,
      },
    };
    this.emitPageMagicEvent(event);
  }
}