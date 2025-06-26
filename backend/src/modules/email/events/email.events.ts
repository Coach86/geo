export class SendEmailEvent {
  constructor(
    public readonly to: string,
    public readonly subject: string,
    public readonly template: string,
    public readonly context: Record<string, any>,
  ) {}
}

export class SendWelcomeEmailEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string,
  ) {}
}

export class SendReportReadyEmailEvent {
  constructor(
    public readonly userId: string,
    public readonly projectId: string,
    public readonly reportId: string,
  ) {}
}

export class SendMagicLinkEmailEvent {
  constructor(
    public readonly email: string,
    public readonly token: string,
    public readonly name?: string,
  ) {}
}

export class SendInviteEmailEvent {
  constructor(
    public readonly email: string,
    public readonly inviterName: string,
    public readonly organizationName: string,
    public readonly inviteToken: string,
  ) {}
}

export class SendTrialEndingEmailEvent {
  constructor(
    public readonly userId: string,
    public readonly daysRemaining: number,
  ) {}
}

export class SendSubscriptionConfirmationEmailEvent {
  constructor(
    public readonly userId: string,
    public readonly planName: string,
    public readonly amount: number,
  ) {}
}

export class UpdateLoopsContactEvent {
  constructor(
    public readonly email: string,
    public readonly data: Record<string, any>,
  ) {}
}

export class SendSubscriptionCancelledEmailEvent {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly planName: string,
    public readonly endDate: Date,
  ) {}
}