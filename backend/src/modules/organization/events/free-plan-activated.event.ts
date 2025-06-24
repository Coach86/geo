export class FreePlanActivatedEvent {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
  ) {}
}