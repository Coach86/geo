import { Schema, Document, Types } from 'mongoose';

export interface ArticleMetadata {
  wordCount: number;
  readingTime: number;
  targetKeywords?: string[];
  appliedRules: string[];
}

export interface GeneratedArticle {
  id: string;
  projectId: string;
  title: string;
  content: string;
  summary: string;
  sourceContentIds: string[];
  generationJobId: string;
  metadata: ArticleMetadata;
  status: 'draft' | 'reviewed' | 'published';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedArticleDocument extends Document, Omit<GeneratedArticle, 'id'> {
  _id: Types.ObjectId;
}

export const GeneratedArticleSchema = new Schema<GeneratedArticleDocument>(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    sourceContentIds: [{
      type: String,
      required: true,
    }],
    generationJobId: {
      type: String,
      required: true,
      index: true,
    },
    metadata: {
      wordCount: {
        type: Number,
        required: true,
      },
      readingTime: {
        type: Number,
        required: true,
      },
      targetKeywords: [{
        type: String,
      }],
      appliedRules: [{
        type: String,
        required: true,
      }],
    },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'reviewed', 'published'],
      default: 'draft',
    },
    publishedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
    collection: 'generated_articles',
  },
);

// Create indexes
GeneratedArticleSchema.index({ projectId: 1, createdAt: -1 });
GeneratedArticleSchema.index({ projectId: 1, status: 1 });
GeneratedArticleSchema.index({ projectId: 1, publishedAt: -1 });