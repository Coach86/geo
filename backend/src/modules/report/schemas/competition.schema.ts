import { Schema } from 'mongoose';

// Define the detailed results schema for citations tracking
const DetailedResultSchema = new Schema({
  model: String,
  promptIndex: Number,
  competitor: String,
  originalPrompt: String,
  llmResponse: String,
  brandStrengths: [String],
  brandWeaknesses: [String],
  usedWebSearch: Boolean,
  citations: [{
    url: String,
    title: { type: String, required: false },
    text: { type: String, required: false }
  }],
  toolUsage: [{
    type: { type: String },
    parameters: Schema.Types.Mixed,
    execution_details: {
      status: String,
      result: Schema.Types.Mixed,
      error: { type: String, required: false }
    }
  }]
}, { _id: false });

// Define the competition schema
export const CompetitionSchema = new Schema({
  brandName: String,
  competitors: [String],
  competitorAnalyses: [{
    competitor: String,
    analysisByModel: [{
      model: String,
      strengths: [String],
      weaknesses: [String]
    }]
  }],
  competitorMetrics: [{
    competitor: String,
    overallRank: Number,
    mentionRate: Number,
    modelMentions: [{
      model: String,
      rank: Number,
      mentionRate: Number
    }]
  }],
  commonStrengths: [String],
  commonWeaknesses: [String],
  detailedResults: [DetailedResultSchema]
}, { _id: false, strict: false });