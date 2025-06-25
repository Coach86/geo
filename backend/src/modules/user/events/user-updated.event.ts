export class UserUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly updates: {
      email?: string;
      phoneNumber?: string;
      language?: string;
      organizationId?: string;
    },
    public readonly previousEmail?: string, // For email changes
  ) {}
}