export class OrganizationPlanUpdatedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly planName: string,
    public readonly planActivatedAt: Date,
    public readonly isOnTrial: boolean,
    public readonly userEmails: string[],
    public readonly trialEndsAt?: Date,
    public readonly subscriptionStatus?: string,
  ) {}
}