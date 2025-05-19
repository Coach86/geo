# Brand Intelligence Report Email Implementation Plan

This document outlines the implementation plan for enabling users to receive brand intelligence reports via email with secure, time-limited access links.

## Overview

When a new weekly report is generated, the system will:
1. Send an email to the user with a link to view the report
2. The link will contain a secure token valid for 24 hours
3. The frontend will use this token to fetch the report data
4. If the token is expired, the frontend will offer to send a new email with a fresh token

## 1. Backend Implementation

### 1.1 Token Generation and Management

Create a new schema and service for managing report access tokens:

```typescript
// src/modules/report/schemas/report-access-token.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ReportAccessTokenDocument = ReportAccessToken & Document;

@Schema()
export class ReportAccessToken {
  @Prop({ required: true })
  token: string;

  @Prop({ required: true })
  reportId: string;

  @Prop({ required: true })
  companyId: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;
}

export const ReportAccessTokenSchema = SchemaFactory.createForClass(ReportAccessToken);
```

### 1.2 Extend Report Service

Add methods to the `ReportService` to handle token generation and verification:

```typescript
// Add to src/modules/report/services/report.service.ts

import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';

// Add to the ReportService class
async generateAccessToken(reportId: string, companyId: string): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const expiresAt = addDays(new Date(), 1); // 24 hour expiration
  
  const accessToken = new this.reportAccessTokenModel({
    token,
    reportId,
    companyId,
    expiresAt,
  });
  
  await accessToken.save();
  return token;
}

async validateAccessToken(token: string): Promise<{ valid: boolean; reportId?: string; companyId?: string }> {
  const accessToken = await this.reportAccessTokenModel.findOne({ token }).exec();
  
  if (!accessToken) {
    return { valid: false };
  }
  
  if (accessToken.expiresAt < new Date()) {
    return { valid: false, reportId: accessToken.reportId, companyId: accessToken.companyId };
  }
  
  return { 
    valid: true, 
    reportId: accessToken.reportId, 
    companyId: accessToken.companyId 
  };
}
```

### 1.3 Implement Email Sending on Report Generation

Create a new email template that only contains the link to access the report, not the actual report data:

```typescript
// Create a new file: src/modules/report/email/templates/ReportAccessEmail.tsx

import { 
  Body, 
  Container, 
  Head, 
  Heading, 
  Html, 
  Link, 
  Preview, 
  Section, 
  Text, 
  Button,
  Hr,
  Img
} from '@react-email/components';
import * as React from 'react';

interface ReportAccessEmailProps {
  companyName: string;
  reportDate: string;
  accessUrl: string;
}

export const ReportAccessEmail = ({
  companyName,
  reportDate,
  accessUrl,
}: ReportAccessEmailProps) => {
  const previewText = `Your Brand Intelligence Report for ${companyName} is ready`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src="https://contexte.ai/logo.png"
              width="150"
              height="40"
              alt="Contexte.ai"
              style={logo}
            />
          </Section>
          <Heading style={heading}>Your Brand Intelligence Report is Ready</Heading>
          <Text style={paragraph}>
            We've generated a new Brand Intelligence Report for {companyName}.
            This report analyzes how your brand is perceived across leading AI models,
            measuring visibility, sentiment, brand compliance, and competitive positioning.
          </Text>
          <Text style={paragraph}>
            Report date: <strong>{reportDate}</strong>
          </Text>
          <Section style={buttonContainer}>
            <Button
              pX={20}
              pY={12}
              style={button}
              href={accessUrl}
            >
              View Full Report
            </Button>
          </Section>
          <Text style={paragraph}>
            This link will expire in 24 hours. If you need a new access link after
            expiration, you can request one through the expired link page.
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            © {new Date().getFullYear()} Contexte.ai — All Rights Reserved
          </Text>
          <Text style={footer}>
            This email was sent to you because you have an account with Contexte.ai.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ReportAccessEmail;

// Styles
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 25px 48px',
  backgroundColor: '#ffffff',
  maxWidth: '600px',
};

const logoContainer = {
  marginBottom: '32px',
};

const logo = {
  margin: '0 auto',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '30px 0',
  color: '#1a1a1a',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#444444',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#4361ee',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '220px',
  margin: '0 auto',
};

const hr = {
  borderColor: '#e6e6e6',
  margin: '42px 0 26px',
};

const footer = {
  fontSize: '13px',
  lineHeight: '21px',
  color: '#8c8c8c',
  textAlign: 'center' as const,
  marginBottom: '8px',
};
```

Enhance the report generation to include sending this email:

```typescript
// Add to src/modules/report/services/report.service.ts

import React from 'react';
import { Resend } from 'resend';
import { format } from 'date-fns';
import ReportAccessEmail from '../email/templates/ReportAccessEmail';

// Modify saveReport method to include email sending
async saveReport(report: WeeklyBrandReportEntity): Promise<WeeklyBrandReportEntity> {
  // Existing implementation...
  
  // After saving the report, generate token and send email
  const token = await this.generateAccessToken(saved.id, report.companyId);
  await this.sendReportAccessEmail(saved, token);
  
  return saved;
}

// Add new method to send email
async sendReportAccessEmail(report: WeeklyBrandReportEntity, token: string): Promise<void> {
  try {
    // Get company and user information
    const company = await this.companyService.findById(report.companyId);
    const user = await this.userService.findByCompanyId(report.companyId);
    
    if (!user || !user.email) {
      this.logger.warn(`Could not send report email - no user or email for company ${report.companyId}`);
      return;
    }
    
    // Generate the access URL with token
    const baseUrl = this.configService.get<string>('FRONTEND_URL');
    const accessUrl = `${baseUrl}/report?token=${token}`;
    
    // Format the report date
    const reportDate = format(report.weekStart, 'MMMM d, yyyy');
    
    // Create and send email via Resend
    const resend = new Resend(this.configService.get<string>('RESEND_API_KEY'));
    await resend.emails.send({
      from: 'reports@contexte.ai',
      to: user.email,
      subject: `Your Brand Intelligence Report for ${company.name} is Ready`,
      react: React.createElement(ReportAccessEmail, {
        companyName: company.name,
        reportDate: reportDate,
        accessUrl: accessUrl,
      }),
    });
    
    this.logger.log(`Report access email sent to ${user.email} for company ${report.companyId}`);
  } catch (error) {
    this.logger.error(`Failed to send report access email: ${error.message}`, error.stack);
  }
}
```

### 1.4 Add New API Endpoints

Create new endpoints to handle token validation and resending:

```typescript
// Add to src/modules/report/controllers/report.controller.ts

@Get('access/:token')
@ApiOperation({ summary: 'Validate a report access token' })
@ApiParam({ name: 'token', description: 'Access token' })
@ApiResponse({ status: 200, description: 'Token validation result' })
async validateToken(@Param('token') token: string): Promise<{ valid: boolean; reportId?: string; companyId?: string }> {
  return this.reportService.validateAccessToken(token);
}

@Post('resend/:companyId/:reportId')
@ApiOperation({ summary: 'Resend report access email' })
@ApiParam({ name: 'companyId', description: 'Company ID' })
@ApiParam({ name: 'reportId', description: 'Report ID' })
@ApiResponse({ status: 200, description: 'Email resent successfully' })
async resendReportEmail(
  @Param('companyId') companyId: string,
  @Param('reportId') reportId: string,
): Promise<{ success: boolean }> {
  const report = await this.reportService.getReportById(reportId);
  if (!report || report.companyId !== companyId) {
    throw new NotFoundException('Report not found');
  }
  
  const token = await this.reportService.generateAccessToken(reportId, companyId);
  await this.reportService.sendReportAccessEmail(report, token);
  
  return { success: true };
}
```

## 2. Frontend Implementation (contexte-ai-brand-intelligence-newsletter)

The current frontend (`contexte-ai-brand-intelligence-newsletter` directory) needs to be modified to handle token-based report access. These changes will allow users to access reports directly from email links.

### 2.1 Create Report Access Page 

Create a new page in the frontend to handle report access via token:

```typescript
// contexte-ai-brand-intelligence-newsletter/app/report/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import BrandReport from '@/components/brand-report';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function ReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tokenInfo, setTokenInfo] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResent, setEmailResent] = useState(false);
  
  const token = searchParams.get('token');
  
  // API base URL - conditionally use localhost for development
  const API_BASE_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000' 
    : process.env.NEXT_PUBLIC_API_URL;
  
  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('No access token provided');
      return;
    }
    
    async function validateTokenAndFetchReport() {
      try {
        // 1. Validate token
        const tokenResponse = await fetch(`${API_BASE_URL}/reports/access/${token}`);
        const tokenData = await tokenResponse.json();
        setTokenInfo(tokenData);
        
        if (!tokenData.valid) {
          setLoading(false);
          setError('Access token is invalid or expired');
          return;
        }
        
        // 2. Fetch report data
        const reportResponse = await fetch(
          `${API_BASE_URL}/reports/${tokenData.companyId}/latest`, 
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        if (!reportResponse.ok) {
          throw new Error('Failed to fetch report data');
        }
        
        const report = await reportResponse.json();
        
        // Transform backend data format to match the frontend BrandReport component's expected structure
        // This transformation is critical to make the backend data work with the frontend components
        const formattedData = transformReportData(report);
        setReportData(formattedData);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError(err.message || 'An error occurred while loading the report');
      }
    }
    
    validateTokenAndFetchReport();
  }, [token]);
  
  // Transform backend data to the format expected by BrandReport component
  function transformReportData(report) {
    // The mapping is based on the example data structure from generateReport.ts
    // and the structure expected by BrandReport.tsx
    return {
      brand: report.companyName || "Your Brand",
      metadata: {
        url: report.companyWebsite || "brand.com",
        market: "US Market / English",
        flag: "🇺🇸",
        competitors: report.topCompetitors?.join(', ') || "Competitor A, Competitor B, Competitor C",
        date: new Date(report.generatedAt).toISOString().split('T')[0],
        models: Object.keys(report.llmVersions || {}).join(', ') || 
                "ChatGPT‑4o, Claude 3 Sonnet, Gemini 1.5 Pro, Mistral Le Chat Large",
      },
      kpi: {
        pulse: {
          value: `${Math.round(report.spontaneous?.summary?.mentionRate * 100) || 56}%`,
          description: "Global Visibility Score across all tested models",
        },
        tone: {
          value: getSentimentValue(report.sentimentAccuracy?.summary?.overallSentiment),
          status: getSentimentStatus(report.sentimentAccuracy?.summary?.overallSentiment),
          description: "Overall sentiment score across all models",
        },
        accord: {
          value: "6.2/10", // Would need actual mapping from backend data
          status: "yellow",
          description: "Brand compliance with provided attributes",
        },
        arena: {
          competitors: getTopCompetitors(report.comparison?.summary?.keyDifferentiators),
          description: "Top competitors mentioned by AI models",
        },
      },
      // Include all other sections (pulse, tone, accord, arena, etc.) with their respective transformations
      // This is a simplified mapping - the full implementation would need to map all fields
      pulse: {
        promptsTested: report.spontaneous?.results?.length || 15,
        modelVisibility: generateModelVisibilityData(report),
      },
      tone: {
        sentiments: generateSentimentsData(report),
        questions: generateQuestionsData(report),
      },
      accord: {
        attributes: [
          { name: "Sustainability", rate: "64%", alignment: "✅" },
          { name: "Affordability", rate: "42%", alignment: "⚠️" },
          { name: "Trust", rate: "78%", alignment: "✅" },
          { name: "Circular Economy", rate: "35%", alignment: "❌" },
          { name: "Warranty", rate: "28%", alignment: "❌" },
        ],
        score: { value: "6.2/10", status: "yellow" },
      },
      arena: {
        competitors: generateCompetitorsData(report),
        battle: generateBattleData(report),
      },
      // Add other sections as needed (lift, trace)
      lift: {
        recommendations: [
          {
            text: "Submit FAQ markup to improve Gemini visibility",
            priority: "High",
            priorityClass: "priority-high",
            effort: "Easy",
            effortClass: "effort-easy",
          },
          {
            text: 'Include "circular economy" keyword in homepage H1',
            priority: "Medium",
            priorityClass: "priority-medium",
            effort: "Easy",
            effortClass: "effort-easy",
          },
          {
            text: "Publish comparison vs Amazon Renewed focusing on reliability",
            priority: "High",
            priorityClass: "priority-high",
            effort: "Hard",
            effortClass: "effort-hard",
          },
        ],
      },
      trace: {
        sources: [
          {
            name: "YouTube",
            percentage: 22,
            color: "#1976d2",
            url: "https://www.youtube.com/results?search_query=brand+reviews",
          },
          { name: "Reddit", percentage: 18, color: "#2196f3", url: "https://www.reddit.com/search/?q=brand+reviews" },
          { name: "Official Site", percentage: 15, color: "#64b5f6", url: "https://www.brand.com" },
          { name: "TechRadar", percentage: 10, color: "#90caf9", url: "https://www.techradar.com/reviews/brand" },
          { name: "Trustpilot", percentage: 7, color: "#bbdefb", url: "https://www.trustpilot.com/review/brand.com" },
          { name: "Wikipedia", percentage: 6, color: "#e3f2fd", url: "https://en.wikipedia.org/wiki/Brand" },
          { name: "Other", percentage: 22, color: "#ccc" },
        ],
        modelStats: [
          { model: "ChatGPT‑4o", webAccessRate: 85 },
          { model: "Claude 3", webAccessRate: 92 },
          { model: "Mistral Large", webAccessRate: 78 },
          { model: "Gemini 1.5 Pro", webAccessRate: 88 },
        ],
      },
    };
  }
  
  // Helper functions for data transformation
  function getSentimentValue(sentiment) {
    switch(sentiment) {
      case 'positive': return '+0.35';
      case 'neutral': return '0.00';
      case 'negative': return '-0.35';
      default: return '+0.20';
    }
  }
  
  function getSentimentStatus(sentiment) {
    switch(sentiment) {
      case 'positive': return 'green';
      case 'neutral': return 'yellow';
      case 'negative': return 'red';
      default: return 'yellow';
    }
  }
  
  function getTopCompetitors(differentiators) {
    // Extract competitor names from differentiators or use defaults
    if (!differentiators || differentiators.length === 0) {
      return ["Back Market", "Amazon Renewed", "Swappie"];
    }
    return differentiators.slice(0, 3);
  }
  
  function generateModelVisibilityData(report) {
    // Implement real mapping from report data
    return [
      { model: "Claude 3", value: 70 },
      { model: "ChatGPT‑4o", value: 68 },
      { model: "Mistral Large", value: 54 },
      { model: "Gemini 1.5 Pro", value: 32 },
      { model: "Global Avg", value: 56, isAverage: true },
    ];
  }
  
  function generateSentimentsData(report) {
    // Implement real mapping from report data
    return [
      {
        model: "ChatGPT‑4o",
        sentiment: "+0.35",
        status: "green",
        positives: "affordable, eco",
        negatives: "limited warranty",
      },
      {
        model: "Claude 3",
        sentiment: "+0.18",
        status: "yellow",
        positives: "reliable, fast ship",
        negatives: "pricey",
      },
      {
        model: "Gemini",
        sentiment: "+0.05",
        status: "yellow",
        positives: "cheap, easy buy",
        negatives: "quality doubts",
      },
      {
        model: "Global Avg",
        sentiment: "+0.20",
        status: "green",
        positives: "—",
        negatives: "—",
        isAverage: true,
      },
    ];
  }
  
  function generateQuestionsData(report) {
    // Implement real mapping from report data
    return [
      {
        question: "What do you think of …?",
        results: [
          { model: "ChatGPT‑4o", sentiment: "+0.35", status: "green", keywords: "affordable, eco-friendly" },
          { model: "Claude 3", sentiment: "+0.18", status: "yellow", keywords: "reliable, somewhat pricey" },
          { model: "Mistral Large", sentiment: "+0.22", status: "green", keywords: "good quality, trusted" },
          { model: "Gemini 1.5 Pro", sentiment: "+0.05", status: "yellow", keywords: "mixed reviews" },
        ],
      },
      // Additional questions...
    ];
  }
  
  function generateCompetitorsData(report) {
    // Implement real mapping from report data
    return [
      {
        name: "Back Market",
        chatgpt: 1,
        claude: 1,
        mistral: 2,
        gemini: 2,
        global: "56%",
        size: "lg",
        sentiment: "positive",
      },
      // Additional competitors...
    ];
  }
  
  function generateBattleData(report) {
    // Implement real mapping from report data
    return {
      competitors: [
        {
          name: "Back Market",
          comparisons: [
            {
              model: "ChatGPT‑4o",
              positives: ["lower defect rate", "longer warranty"],
              negatives: ["smaller catalogue"],
            },
            // Additional model comparisons...
          ],
        },
        // Additional competitors...
      ],
      chatgpt: {
        positives: ["lower defect rate", "longer warranty", "better customer service"],
        negatives: ["smaller catalogue", "higher price point"],
      },
      claude: {
        positives: ["more rigorous testing", "eco-friendly packaging"],
        negatives: ["slower shipping times", "fewer payment options"],
      },
    };
  }
  
  // Handle resend email
  const handleResendEmail = async () => {
    if (!tokenInfo || !tokenInfo.reportId || !tokenInfo.companyId) return;
    
    setResendingEmail(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/reports/resend/${tokenInfo.companyId}/${tokenInfo.reportId}`,
        { method: 'POST' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to resend email');
      }
      
      setEmailResent(true);
      setResendingEmail(false);
    } catch (err) {
      setError('Failed to request a new email. Please try again later.');
      setResendingEmail(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading your report...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Access Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          {tokenInfo && !tokenInfo.valid && !emailResent && (
            <div className="text-center">
              <p className="mb-4 text-gray-600">
                Your access link has expired. Would you like us to send you a new one?
              </p>
              <Button 
                onClick={handleResendEmail} 
                disabled={resendingEmail}
                className="w-full"
              >
                {resendingEmail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : 'Send New Access Link'}
              </Button>
            </div>
          )}
          
          {emailResent && (
            <Alert className="mt-6">
              <AlertTitle>Email Sent</AlertTitle>
              <AlertDescription>A new access link has been sent to your email address.</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    );
  }
  
  if (!reportData) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="max-w-md w-full">
          <Alert>
            <AlertTitle>No Report Data</AlertTitle>
            <AlertDescription>No report data is available.</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <BrandReport data={reportData} />
      </div>
    </main>
  );
}
```

### 2.2 Ensure BrandReport Component Compatibility

Verify that the `BrandReport` component in `contexte-ai-brand-intelligence-newsletter/components/brand-report.tsx` can properly handle the data format provided by the backend. The key data structures to ensure compatibility are:

1. The report data structure as used in `contexte-ai-brand-intelligence-newsletter/app/page.tsx`
2. The email data structure defined in `src/modules/report/email/examples/generateReport.ts`

Both structures should be aligned so that the transformation from backend to frontend data is straightforward.

### 2.3 Frontend Environment Setup

Create or update the environment configuration files:

```javascript
// contexte-ai-brand-intelligence-newsletter/.env.development
NEXT_PUBLIC_API_URL=http://localhost:3000

// contexte-ai-brand-intelligence-newsletter/.env.production
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### 2.4 Update Dependencies

Ensure that the frontend project has all necessary dependencies:

```bash
# Navigate to the frontend directory
cd contexte-ai-brand-intelligence-newsletter

# Add any missing dependencies
npm install react-query date-fns
```

## 3. Data Structure Mapping

The critical part of this implementation is mapping between the backend data structure (as defined in WeeklyBrandReport entity) and the frontend structure expected by BrandReport component. Here's the key mapping based on the data in `generateReport.ts`:

```typescript
// Backend report structure (simplified from WeeklyBrandReport entity)
interface BackendReport {
  id: string;
  companyId: string;
  weekStart: Date;
  spontaneous: {
    results: Array<{
      llmProvider: string;
      promptIndex: number;
      mentioned: boolean;
      topOfMind: string[];
    }>;
    summary: {
      mentionRate: number;
      topMentions: string[];
    };
  };
  sentimentAccuracy: {
    results: Array<{
      llmProvider: string;
      promptIndex: number;
      sentiment: 'positive' | 'neutral' | 'negative';
      accuracy: number;
      extractedFacts: string[];
    }>;
    summary: {
      overallSentiment: 'positive' | 'neutral' | 'negative';
      averageAccuracy: number;
    };
  };
  comparison: {
    results: Array<{
      llmProvider: string;
      promptIndex: number;
      winner: string;
      differentiators: string[];
    }>;
    summary: {
      winRate: number;
      keyDifferentiators: string[];
    };
  };
  llmVersions: Record<string, string>;
  generatedAt: Date;
}

// Frontend report structure (from generateReport.ts)
interface FrontendReport {
  brand: string;
  metadata: {
    url: string;
    market: string;
    flag: string;
    competitors: string;
    date: string;
    models: string;
  };
  kpi: {
    pulse: {
      value: string;
      description: string;
    };
    tone: {
      value: string;
      status: 'green' | 'yellow' | 'red';
      description: string;
    };
    accord: {
      value: string;
      status: 'green' | 'yellow' | 'red';
      description: string;
    };
    arena: {
      competitors: string[];
      description: string;
    };
  };
  pulse: {
    promptsTested: number;
    modelVisibility: Array<{
      model: string;
      value: number;
      isAverage?: boolean;
    }>;
  };
  tone: {
    sentiments: Array<{
      model: string;
      sentiment: string;
      status: 'green' | 'yellow' | 'red';
      positives: string;
      negatives: string;
      isAverage?: boolean;
    }>;
    questions: Array<{
      question: string;
      results: Array<{
        model: string;
        sentiment: string;
        status: 'green' | 'yellow' | 'red';
        keywords: string;
      }>;
    }>;
  };
  accord: {
    attributes: Array<{
      name: string;
      rate: string;
      alignment: '✅' | '⚠️' | '❌';
    }>;
    score: {
      value: string;
      status: 'green' | 'yellow' | 'red';
    };
  };
  arena: {
    competitors: Array<{
      name: string;
      chatgpt: number;
      claude: number;
      mistral: number;
      gemini: number;
      global: string;
      size: 'sm' | 'md' | 'lg';
      sentiment: 'positive' | 'neutral' | 'negative';
    }>;
    battle: {
      competitors: Array<{
        name: string;
        comparisons: Array<{
          model: string;
          positives: string[];
          negatives: string[];
        }>;
      }>;
      chatgpt: {
        positives: string[];
        negatives: string[];
      };
      claude: {
        positives: string[];
        negatives: string[];
      };
    };
  };
  lift?: {
    recommendations: Array<{
      text: string;
      priority: string;
      priorityClass: string;
      effort: string;
      effortClass: string;
    }>;
  };
  trace?: {
    sources: Array<{
      name: string;
      percentage: number;
      color: string;
      url?: string;
    }>;
    modelStats: Array<{
      model: string;
      webAccessRate: number;
    }>;
  };
}
```

## 4. Configuration Updates

Update the environment configuration to include the necessary variables:

```dotenv
# .env additions
FRONTEND_URL=http://localhost:3001
RESEND_API_KEY=your_resend_api_key
REPORT_TOKEN_EXPIRY_HOURS=24
```

For local development, ensure the frontend URL points to localhost. In production, it should point to the deployed frontend URL.

## 5. Local Development Testing

For local testing, follow these steps:

1. Start both backend and frontend services in development mode:
   ```bash
   # Backend
   cd /path/to/backend
   npm run start:dev
   
   # Frontend (in separate terminal)
   cd /path/to/contexte-ai-brand-intelligence-newsletter
   npm run dev
   ```

2. Configure environment variables for local testing:
   ```dotenv
   # Backend .env
   FRONTEND_URL=http://localhost:3000
   RESEND_API_KEY=your_resend_api_key
   
   # Frontend .env.local
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

3. Testing workflow:
   - Generate a test report via API or admin interface
   - Check console logs for the email sending confirmation
   - If using Resend in test mode, check their dashboard for the email
   - For local testing without actually sending emails, add a `/debug` endpoint that returns the latest generated access URL:

   ```typescript
   // ONLY FOR DEVELOPMENT
   @Get('debug/latest-token/:companyId')
   @ApiOperation({ summary: 'Get latest access token for testing (development only)' })
   async getLatestToken(@Param('companyId') companyId: string): Promise<{ url: string }> {
     if (process.env.NODE_ENV !== 'development') {
       throw new ForbiddenException('This endpoint is only available in development mode');
     }
     
     const token = await this.reportAccessTokenModel
       .findOne({ companyId })
       .sort({ createdAt: -1 })
       .exec();
     
     if (!token) {
       throw new NotFoundException('No tokens found for this company');
     }
     
     const baseUrl = this.configService.get<string>('FRONTEND_URL');
     const url = `${baseUrl}/report?token=${token.token}`;
     
     return { url };
   }
   ```

## 6. Implementation Timeline

1. **Backend Changes** (2-3 days)
   - Create token schema and service
   - Implement token generation and validation
   - Create new email template without report data
   - Add email sending functionality
   - Create new API endpoints
   - Update report generation to send emails

2. **Frontend Changes** (1-2 days)
   - Create report access page
   - Implement token validation and report fetching
   - Add email resend functionality
   - Style access screens

3. **Email Template Development** (1 day)
   - Design and implement the email access template
   - Test email rendering and link functionality

4. **Testing** (1-2 days)
   - Test token generation and validation
   - Test email sending
   - Test frontend report access
   - Test token expiration and resend workflow

5. **Documentation and Deployment** (1 day)
   - Update documentation
   - Configure production environment
   - Deploy changes

## 7. Security Considerations

1. **Token Security**
   - Use cryptographically secure random tokens
   - Implement proper expiration handling
   - Consider rate limiting token generation to prevent abuse

2. **Access Control**
   - Validate that the token is associated with the requested report
   - Implement proper authorization checks

3. **Email Safety**
   - Do not include sensitive information in emails
   - Use secure links (HTTPS)
   - Include clear branding to prevent phishing confusion

4. **Environment Configuration**
   - Keep API keys secure and out of source control
   - Use different keys for development and production

## 8. Future Enhancements

1. **Analytics**
   - Track email opens and link clicks
   - Record when reports are viewed

2. **User Preferences**
   - Allow users to opt in/out of email notifications
   - Configure preferred report format

3. **User-Company Relationship Management**
   - Implement additional email recipients for a company (since one company belongs to one user currently)
   - Allow the user to add additional email addresses to receive reports for their company
   - Add notification settings per company

4. **Scheduling**
   - Allow users to schedule regular email reports
   - Configure preferred delivery time/day