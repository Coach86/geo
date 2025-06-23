import { Injectable } from '@nestjs/common';
import { BrandReportDocument } from '../schemas/brand-report.schema';
import { BrandReportResponseDto } from '../dto/brand-report-response.dto';

/**
 * Service for mapping brand report documents to DTOs
 * Handles data transformation and format conversions
 */
@Injectable()
export class BrandReportMapperService {
  
  mapToResponseDto(report: BrandReportDocument): BrandReportResponseDto {
    // Map alignment data to match DTO structure
    interface AlignmentResponseData {
      overallAlignmentScore: number;
      averageAttributeScores: Record<string, number>;
      attributeAlignmentSummary: Array<{
        name: string;
        mentionRate: string;
        alignment: string;
      }>;
      detailedResults: Array<{
        model: string;
        promptIndex?: number;
        originalPrompt?: string;
        llmResponse?: string;
        attributeScores: Array<{
          attribute: string;
          score: number;
          evaluation: string;
        }>;
        toolUsage?: Array<{
          type: string;
          parameters?: Record<string, unknown>;
          execution_details?: {
            status: string;
            result?: unknown;
            error?: string;
          };
        }>;
        citations?: Array<{
          url: string;
          title?: string;
          text?: string;
        }>;
        error?: string;
      }>;
    }

    let alignmentData: AlignmentResponseData = {
      overallAlignmentScore: 0,
      averageAttributeScores: {},
      attributeAlignmentSummary: [],
      detailedResults: []
    };

    if (report.alignment) {
      if (report.alignment.summary) {
        alignmentData = {
          overallAlignmentScore: report.alignment.summary.overallAlignmentScore ?? 0,
          averageAttributeScores: report.alignment.summary.averageAttributeScores || {},
          attributeAlignmentSummary: report.alignment.summary.attributeAlignmentSummary || [],
          detailedResults: report.alignment.detailedResults || []
        };
      } else {
        // Fallback for old format
        alignmentData = report.alignment as unknown as AlignmentResponseData;
      }
    }

    return {
      id: report.id,
      projectId: report.projectId,
      reportDate: report.reportDate,
      generatedAt: report.generatedAt,
      brandName: report.brandName,
      metadata: report.metadata,
      explorer: report.explorer,
      visibility: report.visibility,
      sentiment: report.sentiment,
      alignment: alignmentData,
      competition: report.competition,
    };
  }
}