export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly organizationId: string,
    public readonly language: string,
    public readonly createdAt: string,
  ) {}
}