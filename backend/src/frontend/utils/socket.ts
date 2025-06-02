/**
 * Socket.IO client for batch events
 */
import { io, Socket } from 'socket.io-client';

export interface BatchEvent {
  batchExecutionId: string;
  projectId: string;
  projectName: string;
  eventType:
    | 'batch_started'
    | 'pipeline_started'
    | 'pipeline_completed'
    | 'pipeline_failed'
    | 'batch_completed'
    | 'batch_failed';
  pipelineType?: 'spontaneous' | 'sentiment' | 'comparison' | 'accuracy' | 'full';
  message: string;
  timestamp: Date;
  progress?: number; // 0-100
  error?: string;
}

const socketNamespace = '/batch-events';

class SocketManager {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<(event: BatchEvent) => void>> = new Map();
  private connectionPromise: Promise<void> | null = null;

  /**
   * Connect to the Socket.IO server
   */
  async connect(): Promise<void> {
    // If already connecting, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // If already connected, return immediately
    if (this.socket && this.socket.connected) {
      return;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // Connect to the batch-events namespace (same origin as API)
        console.log('Connecting to socket at:', socketNamespace);

        // Connect to the batch-events namespace
        this.socket = io(socketNamespace, {
          path: '/api/socket-io/',
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
          console.log('Connected to batch events socket');
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Disconnected from batch events socket:', reason);
        });

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          reject(error);
        });

        console.log('Listening for batch events');
        // Listen for batch events
        this.socket.on('batch_event', (event: BatchEvent) => {
          console.log('Received batch event:', event);
          this.handleBatchEvent(event);
        });
      } catch (error) {
        console.error('Failed to create socket connection:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Disconnect from the Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionPromise = null;
    this.eventHandlers.clear();
  }

  /**
   * Subscribe to batch events for a specific batch execution
   */
  subscribeToBatchEvents(
    batchExecutionId: string,
    handler: (event: BatchEvent) => void,
  ): () => void {
    if (!this.eventHandlers.has(batchExecutionId)) {
      this.eventHandlers.set(batchExecutionId, new Set());
    }

    this.eventHandlers.get(batchExecutionId)!.add(handler);

    // Return unsubscribe function
    return () => {
      console.log('Unsubscribing from batch events for batch:', batchExecutionId);
      const handlers = this.eventHandlers.get(batchExecutionId);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(batchExecutionId);
        }
      }
    };
  }

  /**
   * Subscribe to all batch events (useful for global notifications)
   */
  subscribeToAllBatchEvents(handler: (event: BatchEvent) => void): () => void {
    const globalKey = '_global_';
    if (!this.eventHandlers.has(globalKey)) {
      this.eventHandlers.set(globalKey, new Set());
    }

    this.eventHandlers.get(globalKey)!.add(handler);

    // Return unsubscribe function
    return () => {
      console.log('Unsubscribing from all batch events');
      const handlers = this.eventHandlers.get(globalKey);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.eventHandlers.delete(globalKey);
        }
      }
    };
  }

  /**
   * Handle incoming batch events and distribute to subscribers
   */
  private handleBatchEvent(event: BatchEvent): void {
    console.log('Handling batch event:', event);
    // Call handlers for this specific batch execution
    const batchHandlers = this.eventHandlers.get(event.batchExecutionId);
    if (batchHandlers) {
      batchHandlers.forEach((handler) => {
        try {
          console.log('Calling batch handler');
          handler(event);
        } catch (error) {
          console.error('Error in batch event handler:', error);
        }
      });
    } else {
      console.log('No local handlers for batch execution:', event.batchExecutionId);
    }

    // Call global handlers
    const globalHandlers = this.eventHandlers.get('_global_');
    if (globalHandlers) {
      globalHandlers.forEach((handler) => {
        try {
          console.log('Calling global handler');
          handler(event);
        } catch (error) {
          console.error('Error in global batch event handler:', error);
        }
      });
    } else {
      console.log('No global handlers');
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.connectionPromise) return 'connecting';
    return 'disconnected';
  }
}

// Export singleton instance
export const socketManager = new SocketManager();

// Auto-connect when module is imported
socketManager.connect().catch((error) => {
  console.error('Failed to auto-connect to socket server:', error);
});
