import React from 'react';
import { render } from '@react-email/render';
import BrandIntelligenceReport from '../templates/BrandIntelligenceReport';
import { BrandIntelligenceReportData } from '../utils/types';

/**
 * Example of how to generate the HTML for a brand intelligence report
 * @param reportData - The report data
 * @returns The rendered HTML
 */
export const generateReportHtml = (reportData?: BrandIntelligenceReportData): string => {
  // Create example report data if none is provided
  const data = reportData || {
    brand: 'YourBrand',
    metadata: {
      url: 'yourbrand.com',
      market: 'US Market / English',
      flag: '🇺🇸',
      competitors: 'Competitor A, Competitor B, Competitor C',
      date: new Date().toISOString().split('T')[0],
      models: 'ChatGPT‑4o, Claude 3 Sonnet, Gemini 1.5 Pro, Mistral Le Chat Large',
    },
    kpi: {
      pulse: {
        value: '68%',
        description: 'Global Visibility Score across all tested models',
      },
      tone: {
        value: '+0.35',
        status: 'green',
        description: 'Overall sentiment score across all models',
      },
      accord: {
        value: '7.4/10',
        status: 'green',
        description: 'Brand compliance with provided attributes',
      },
      arena: {
        competitors: ['Competitor A', 'Competitor B', 'Competitor C'],
        description: 'Top competitors mentioned by AI models',
      },
    },
    pulse: {
      promptsTested: 15,
      modelVisibility: [
        { model: 'Claude 3', value: 82 },
        { model: 'ChatGPT‑4o', value: 75 },
        { model: 'Mistral Large', value: 60 },
        { model: 'Gemini 1.5 Pro', value: 55 },
        { model: 'Global Avg', value: 68, isAverage: true },
      ],
    },
    tone: {
      sentiments: [
        {
          model: 'ChatGPT‑4o',
          sentiment: '+0.42',
          status: 'green',
          positives: 'innovative, user-friendly',
          negatives: 'premium pricing',
        },
        {
          model: 'Claude 3',
          sentiment: '+0.38',
          status: 'green',
          positives: 'reliable, excellent support',
          negatives: 'complex interface',
        },
        {
          model: 'Gemini',
          sentiment: '+0.25',
          status: 'yellow',
          positives: 'quality product, responsive',
          negatives: 'limited availability',
        },
        {
          model: 'Global Avg',
          sentiment: '+0.35',
          status: 'green',
          positives: '—',
          negatives: '—',
          isAverage: true,
        },
      ],
      questions: [
        {
          question: 'What do you think of YourBrand?',
          results: [
            {
              model: 'ChatGPT‑4o',
              sentiment: '+0.45',
              status: 'green',
              keywords: 'innovative, industry leader',
            },
            {
              model: 'Claude 3',
              sentiment: '+0.40',
              status: 'green',
              keywords: 'reliable, excellent customer service',
            },
            {
              model: 'Mistral Large',
              sentiment: '+0.35',
              status: 'green',
              keywords: 'high quality, trusted',
            },
            {
              model: 'Gemini 1.5 Pro',
              sentiment: '+0.25',
              status: 'yellow',
              keywords: 'good but expensive',
            },
          ],
        },
        {
          question: 'Key pros/cons of YourBrand?',
          results: [
            {
              model: 'ChatGPT‑4o',
              sentiment: '+0.38',
              status: 'green',
              keywords: 'innovative vs premium pricing',
            },
            {
              model: 'Claude 3',
              sentiment: '+0.36',
              status: 'green',
              keywords: 'reliability vs availability',
            },
            {
              model: 'Mistral Large',
              sentiment: '+0.30',
              status: 'green',
              keywords: 'quality vs limited options',
            },
            {
              model: 'Gemini 1.5 Pro',
              sentiment: '+0.20',
              status: 'yellow',
              keywords: 'good features vs complex UI',
            },
          ],
        },
      ],
    },
    accord: {
      attributes: [
        { name: 'Innovation', rate: '82%', alignment: '✅' },
        { name: 'Reliability', rate: '78%', alignment: '✅' },
        { name: 'User-Friendly', rate: '65%', alignment: '✅' },
        { name: 'Value', rate: '48%', alignment: '⚠️' },
        { name: 'Accessibility', rate: '52%', alignment: '⚠️' },
      ],
      score: { value: '7.4/10', status: 'green' },
    },
    arena: {
      competitors: [
        {
          name: 'Competitor A',
          chatgpt: 1,
          claude: 2,
          mistral: 1,
          gemini: 1,
          global: '65%',
          size: 'lg',
          sentiment: 'positive',
        },
        {
          name: 'Competitor B',
          chatgpt: 2,
          claude: 1,
          mistral: 2,
          gemini: 2,
          global: '60%',
          size: 'lg',
          sentiment: 'positive',
        },
        {
          name: 'Competitor C',
          chatgpt: 3,
          claude: 3,
          mistral: 3,
          gemini: 3,
          global: '45%',
          size: 'md',
          sentiment: 'neutral',
        },
      ],
      battle: {
        competitors: [
          {
            name: 'Competitor A',
            comparisons: [
              {
                model: 'ChatGPT‑4o',
                positives: ['more innovative features', 'better UI design'],
                negatives: ['higher price point', 'steeper learning curve'],
              },
              {
                model: 'Claude 3',
                positives: ['better customer support', 'more reliable'],
                negatives: ['fewer integrations', 'more expensive'],
              },
              {
                model: 'Mistral Large',
                positives: ['higher quality', 'more features'],
                negatives: ['less availability', 'premium pricing'],
              },
              {
                model: 'Gemini 1.5 Pro',
                positives: ['more advanced tech', 'better performance'],
                negatives: ['less intuitive', 'higher cost'],
              },
            ],
          },
          {
            name: 'Competitor B',
            comparisons: [
              {
                model: 'ChatGPT‑4o',
                positives: ['more premium quality', 'better support'],
                negatives: ['higher price', 'fewer options'],
              },
              {
                model: 'Claude 3',
                positives: ['more innovative', 'better ecosystem'],
                negatives: ['less accessibility', 'steeper learning curve'],
              },
              {
                model: 'Mistral Large',
                positives: ['better reputation', 'more reliable'],
                negatives: ['more expensive', 'fewer entry-level options'],
              },
              {
                model: 'Gemini 1.5 Pro',
                positives: ['better design', 'higher customer satisfaction'],
                negatives: ['limited availability in some regions'],
              },
            ],
          },
        ],
        chatgpt: {
          positives: ['more innovative features', 'better UI design', 'premium quality'],
          negatives: ['higher price point', 'steeper learning curve'],
        },
        claude: {
          positives: ['better customer support', 'more innovative', 'better ecosystem'],
          negatives: ['fewer integrations', 'more expensive', 'less accessibility'],
        },
      },
    },
  };

  // Render the React component to HTML
  const html = render(BrandIntelligenceReport, { data });
  return html;
};

/**
 * Example usage:
 *
 * import { generateReportHtml } from './generateReport';
 * import fs from 'fs';
 *
 * // Generate HTML for the report
 * const html = generateReportHtml();
 *
 * // Save to file
 * fs.writeFileSync('report.html', html);
 *
 * // Or, to send via email using a library like nodemailer:
 * //
 * // const transporter = nodemailer.createTransport({...});
 * //
 * // await transporter.sendMail({
 * //   from: 'reports@contexte.ai',
 * //   to: 'client@example.com',
 * //   subject: 'Your Brand Intelligence Report',
 * //   html: html
 * // });
 */

export default generateReportHtml;
