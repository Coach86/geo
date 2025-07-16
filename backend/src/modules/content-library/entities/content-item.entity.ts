import { Schema, Document, Types } from 'mongoose';

export interface ContentItemMetadata {
  author?: string;
  publishedDate?: Date;
  source: string;
  wordCount: number;
  extractedAt: Date;
}

export interface ContentItem {
  id: string;
  projectId: string;
  url: string;
  title: string;
  content: string;
  metadata: ContentItemMetadata;
  status: 'pending' | 'processed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentItemDocument extends Document, Omit<ContentItem, 'id'> {
  _id: Types.ObjectId;
}

export const ContentItemSchema = new Schema<ContentItemDocument>(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    metadata: {
      author: {
        type: String,
        required: false,
      },
      publishedDate: {
        type: Date,
        required: false,
      },
      source: {
        type: String,
        required: true,
      },
      wordCount: {
        type: Number,
        required: true,
      },
      extractedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'processed', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
    collection: 'content_items',
  },
);

// Create indexes
ContentItemSchema.index({ projectId: 1, createdAt: -1 });
ContentItemSchema.index({ projectId: 1, status: 1 });
ContentItemSchema.index({ url: 1, projectId: 1 }, { unique: true });