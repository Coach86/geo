import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LoopsService } from '../services/loops.service';
import { UserCreatedEvent } from '../../user/events/user-created.event';
import { UserUpdatedEvent } from '../../user/events/user-updated.event';
import { UserDeletedEvent } from '../../user/events/user-deleted.event';

@Injectable()
export class UserLoopsListener {
  private readonly logger = new Logger(UserLoopsListener.name);

  constructor(private readonly loopsService: LoopsService) {}

  @OnEvent('user.created')
  async handleUserCreated(event: UserCreatedEvent) {
    try {
      this.logger.log(`Handling user.created event for: ${event.email}`);

      await this.loopsService.createOrUpdateContact({
        email: event.email,
        userId: event.userId,
        organizationId: event.organizationId,
        language: event.language,
        createdAt: event.createdAt,
        source: 'mint-ai-signup',
        userGroup: 'user',
        subscribed: true,
      });
    } catch (error) {
      this.logger.error(
        `Failed to handle user.created event: ${error.message}`,
        error.stack
      );
      // Don't throw - we don't want to break the user creation flow
    }
  }

  @OnEvent('user.updated')
  async handleUserUpdated(event: UserUpdatedEvent) {
    try {
      this.logger.log(`Handling user.updated event for: ${event.email}`);

      // If email changed, we need to handle it specially
      if (event.updates.email && event.previousEmail && event.previousEmail !== event.updates.email) {
        // Delete old contact
        await this.loopsService.deleteContact(event.previousEmail);

        // Create new contact with all data
        await this.loopsService.createOrUpdateContact({
          email: event.updates.email,
          userId: event.userId,
          organizationId: event.updates.organizationId,
          language: event.updates.language,
          phoneNumber: event.updates.phoneNumber,
          source: 'mint-ai-signup',
          userGroup: 'user',
          subscribed: true,
        });
      } else {
        // Just update the existing contact
        await this.loopsService.updateContact(event.email, {
          phoneNumber: event.updates.phoneNumber,
          language: event.updates.language,
          organizationId: event.updates.organizationId,
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle user.updated event: ${error.message}`,
        error.stack
      );
      // Don't throw - we don't want to break the user update flow
    }
  }

  @OnEvent('user.deleted')
  async handleUserDeleted(event: UserDeletedEvent) {
    try {
      this.logger.log(`Handling user.deleted event for: ${event.email}`);

      await this.loopsService.deleteContact(event.email);
    } catch (error) {
      this.logger.error(
        `Failed to handle user.deleted event: ${error.message}`,
        error.stack
      );
      // Don't throw - we don't want to break the user deletion flow
    }
  }
}