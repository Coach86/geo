import { Injectable } from '@nestjs/common';
import { LLMCall } from '../schemas/content-score.schema';

/**
 * Service to track all LLM calls during content analysis
 */
@Injectable()
export class LLMCallTrackerService {
  private callsMap = new Map<string, LLMCall[]>();

  /**
   * Start tracking for a specific URL
   */
  startTracking(url: string): void {
    this.callsMap.set(url, []);
  }

  /**
   * Add an LLM call
   */
  addCall(url: string, call: Omit<LLMCall, 'timestamp'>): void {
    const calls = this.callsMap.get(url);
    if (calls) {
      calls.push({
        ...call,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get all calls for a URL
   */
  getCalls(url: string): LLMCall[] {
    return this.callsMap.get(url) || [];
  }

  /**
   * Clear tracking for a URL
   */
  clearTracking(url: string): void {
    this.callsMap.delete(url);
  }
}