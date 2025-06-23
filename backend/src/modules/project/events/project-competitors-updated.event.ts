export class ProjectCompetitorsUpdatedEvent {
  constructor(
    public readonly projectId: string,
    public readonly competitors: string[],
    public readonly organizationId: string,
  ) {}
}