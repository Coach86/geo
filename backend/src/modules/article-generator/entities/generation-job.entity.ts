import { Schema, Document, Types } from 'mongoose';

export interface GenerationJobConfig {
  numberOfArticles: number;
  articleTypes: string[];
  targetLength: 'short' | 'medium' | 'long';
}

export interface GenerationJobResults {
  articlesGenerated: number;
  errors?: string[];
}

export interface GenerationJob {
  id: string;
  projectId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  config: GenerationJobConfig;
  results?: GenerationJobResults;
  createdAt: Date;
  completedAt?: Date;
}

export interface GenerationJobDocument extends Document, Omit<GenerationJob, 'id'> {
  _id: Types.ObjectId;
}

export const GenerationJobSchema = new Schema<GenerationJobDocument>(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
    },
    config: {
      numberOfArticles: {
        type: Number,
        required: true,
        default: 1,
      },
      articleTypes: [{
        type: String,
        required: true,
      }],
      targetLength: {
        type: String,
        required: true,
        enum: ['short', 'medium', 'long'],
        default: 'medium',
      },
    },
    results: {
      articlesGenerated: {
        type: Number,
        required: false,
      },
      errors: [{
        type: String,
        required: false,
      }],
    },
    completedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'generation_jobs',
  },
);

// Create indexes
GenerationJobSchema.index({ projectId: 1, createdAt: -1 });
GenerationJobSchema.index({ status: 1, createdAt: 1 });