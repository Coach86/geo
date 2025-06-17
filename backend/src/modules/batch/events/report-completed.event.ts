export class ReportCompletedEvent {
  constructor(
    public readonly projectId: string,
    public readonly brandName: string,
    public readonly reportId: string,
    public readonly batchExecutionId: string,
    public readonly userId: string,
    public readonly userEmail: string,
    public readonly triggerType: 'manual' | 'cron' | 'new_project',
  ) {}
}