import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoopsClient } from 'loops';

interface LoopsContactProperties {
  firstName?: string;
  lastName?: string;
  email: string;
  source?: string;
  userGroup?: string;
  userId?: string;
  subscribed?: boolean;
  createdAt?: string;
  organizationId?: string;
  language?: string;
  phoneNumber?: string;
}

@Injectable()
export class LoopsService {
  private readonly logger = new Logger(LoopsService.name);
  private loopsClient: LoopsClient | null = null;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('LOOPS_API_KEY');
    if (apiKey) {
      this.loopsClient = new LoopsClient(apiKey);
      this.logger.log('Loops client initialized');
    } else {
      this.logger.warn('LOOPS_API_KEY not configured, Loops integration disabled');
    }
  }

  /**
   * Create or update a contact in Loops
   * @param contactData - Contact data matching Loops properties
   * @returns Success status
   */
  async createOrUpdateContact(contactData: LoopsContactProperties): Promise<boolean> {
    if (!this.loopsClient) {
      this.logger.warn('Loops client not initialized, skipping contact creation');
      return false;
    }

    try {
      this.logger.log(`Creating/updating Loops contact for email: ${contactData.email}`);

      // First, try to find the contact
      let contactExists = false;
      try {
        const findResponse = await this.loopsClient.findContact({ email: contactData.email });
        if (findResponse && findResponse.length > 0) {
          contactExists = true;
          this.logger.log(`Contact found for email: ${contactData.email}`);
        } else {
          this.logger.log(`Contact not found for email: ${contactData.email}`);
        }
      } catch (findError) {
        // If find fails, assume contact doesn't exist
        this.logger.warn(`Error finding contact: ${findError.message}, proceeding with create`);
        contactExists = false;
      }

      const contactProperties = {
        firstName: contactData.firstName || null,
        lastName: contactData.lastName || null,
        source: contactData.source || 'mint-ai',
        userGroup: contactData.userGroup || 'user',
        userId: contactData.userId || null,
        subscribed: contactData.subscribed !== false, // Default to true
        createdAt: contactData.createdAt || new Date().toISOString(),
        // Custom properties
        organizationId: contactData.organizationId || null,
        language: contactData.language || null,
        phoneNumber: contactData.phoneNumber || null,
      };

      if (contactExists) {
        // Contact exists, update it
        this.logger.log(`Updating existing contact: ${contactData.email}`);
        const updateResponse = await this.loopsClient.updateContact(
          contactData.email,
          contactProperties
        );

        if (updateResponse.success) {
          this.logger.log(`Successfully updated Loops contact for: ${contactData.email}`);
          return true;
        } else {
          this.logger.error(`Failed to update Loops contact: ${JSON.stringify(updateResponse)}`);
          return false;
        }
      } else {
        // Contact doesn't exist, create it
        this.logger.log(`Creating new contact: ${contactData.email}`);
        const createResponse = await this.loopsClient.createContact(
          contactData.email,
          contactProperties
        );

        if (createResponse.success) {
          this.logger.log(`Successfully created Loops contact for: ${contactData.email}`);
          return true;
        } else {
          this.logger.error(`Failed to create Loops contact: ${JSON.stringify(createResponse)}`);
          return false;
        }
      }
    } catch (error) {
      this.logger.error(`Error creating/updating Loops contact: ${error.message}`, error.stack);
      // Don't throw to avoid breaking the user creation flow
      return false;
    }
  }

  /**
   * Update contact properties in Loops
   * @param email - Contact email
   * @param properties - Properties to update
   * @returns Success status
   */
  async updateContact(email: string, properties: Partial<LoopsContactProperties>): Promise<boolean> {
    if (!this.loopsClient) {
      this.logger.warn('Loops client not initialized, skipping contact update');
      return false;
    }

    try {
      this.logger.log(`Updating Loops contact: ${email}`);

      const response = await this.loopsClient.updateContact(email, properties);

      if (response.success) {
        this.logger.log(`Successfully updated Loops contact: ${email}`);
        return true;
      } else {
        this.logger.error(`Failed to update Loops contact: ${JSON.stringify(response)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error updating Loops contact: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Delete a contact from Loops
   * @param email - Contact email
   * @returns Success status
   */
  async deleteContact(email: string): Promise<boolean> {
    if (!this.loopsClient) {
      this.logger.warn('Loops client not initialized, skipping contact deletion');
      return false;
    }

    try {
      this.logger.log(`Deleting Loops contact: ${email}`);

      const response = await this.loopsClient.deleteContact({ email });

      if (response.success) {
        this.logger.log(`Successfully deleted Loops contact: ${email}`);
        return true;
      } else {
        this.logger.error(`Failed to delete Loops contact: ${response.message}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error deleting Loops contact: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * Send a transactional email via Loops
   * @param transactionalId - The ID of the transactional email template
   * @param email - Recipient email
   * @param dataVariables - Variables for the email template
   * @returns Success status
   */
  async sendTransactionalEmail(
    transactionalId: string,
    email: string,
    dataVariables?: Record<string, any>
  ): Promise<boolean> {
    if (!this.loopsClient) {
      this.logger.warn('Loops client not initialized, skipping transactional email');
      return false;
    }

    try {
      this.logger.log(`Sending transactional email ${transactionalId} to: ${email}`);

      const response = await this.loopsClient.sendTransactionalEmail({
        transactionalId,
        email,
        dataVariables,
      });

      if (response.success) {
        this.logger.log(`Successfully sent transactional email to: ${email}`);
        return true;
      } else {
        this.logger.error(`Failed to send transactional email: ${JSON.stringify(response)}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`Error sending transactional email: ${error.message}`, error.stack);
      return false;
    }
  }
}