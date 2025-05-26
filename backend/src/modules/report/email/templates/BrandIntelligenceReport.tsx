import React from 'react';
import Layout from '../components/Layout';
import Header from '../components/Header';
import ReportHeader from '../components/report-sections/ReportHeader';
import ExecutiveSummary from '../components/report-sections/ExecutiveSummary';
import PulseSection from '../components/report-sections/PulseSection';
import ToneSection from '../components/report-sections/ToneSection';
import AccordSection from '../components/report-sections/AccordSection';
import ArenaSection from '../components/report-sections/ArenaSection';
import ArenaBattleSection from '../components/report-sections/ArenaBattleSection';
import Footer from '../components/Footer';
import { Section, Text, Link } from '@react-email/components';
import { BrandIntelligenceReportProps, BrandIntelligenceReportData } from '../utils/types';

export const BrandIntelligenceReport: React.FC<BrandIntelligenceReportProps> = ({ data }) => {
  // Adding fallback in case data is not provided
  const reportData = data || {
    brand: '{brand}',
    metadata: {
      url: 'brand.com',
      market: 'US Market / English',
      flag: '🇺🇸',
      competitors: 'Competitor A, Competitor B, Competitor C',
      date: '2025-05-13',
      models: 'ChatGPT‑4o, Claude 3 Sonnet, Gemini 1.5 Pro, Mistral Le Chat Large',
    },
    kpi: {
      pulse: {
        value: '56%',
        description: 'Global Visibility Score across all tested models',
      },
      tone: {
        value: '+0.20',
        status: 'green',
        description: 'Overall sentiment score across all models',
      },
      accord: {
        value: '6.2/10',
        status: 'yellow',
        description: 'Brand compliance with provided attributes',
      },
      arena: {
        competitors: ['Back Market', 'Amazon Renewed', 'Swappie'],
        description: 'Top competitors mentioned by AI models',
      },
    },
    pulse: {
      promptsTested: 15,
      modelVisibility: [
        { model: 'Claude 3', value: 70 },
        { model: 'ChatGPT‑4o', value: 68 },
        { model: 'Mistral Large', value: 54 },
        { model: 'Gemini 1.5 Pro', value: 32 },
        { model: 'Global Avg', value: 56, isAverage: true },
      ],
    },
    tone: {
      sentiments: [
        {
          model: 'ChatGPT‑4o',
          sentiment: '+0.35',
          status: 'green',
          positiveKeywords: ['affordable', 'eco-friendly'],
          negativeKeywords: ['limited warranty'],
        },
        {
          model: 'Claude 3',
          sentiment: '+0.18',
          status: 'yellow',
          positiveKeywords: ['reliable', 'fast shipping'],
          negativeKeywords: ['pricey'],
        },
        {
          model: 'Gemini',
          sentiment: '+0.05',
          status: 'yellow',
          positiveKeywords: ['cheap', 'easy buy'],
          negativeKeywords: ['quality doubts'],
        },
      ],
      questions: [
        {
          question: 'What do you think of …?',
          results: [
            {
              model: 'ChatGPT‑4o',
              sentiment: '+0.35',
              status: 'green',
              positiveKeywords: ['affordable', 'eco-friendly'],
              negativeKeywords: ['limited warranty'],
            },
            {
              model: 'Claude 3',
              sentiment: '+0.18',
              status: 'yellow',
              positiveKeywords: ['reliable'],
              negativeKeywords: ['somewhat pricey'],
            },
            {
              model: 'Mistral Large',
              sentiment: '+0.22',
              status: 'green',
              positiveKeywords: ['good quality', 'trusted'],
              negativeKeywords: ['limited warranty'],
            },
            {
              model: 'Gemini 1.5 Pro',
              sentiment: '+0.05',
              status: 'yellow',
              positiveKeywords: ['mixed reviews'],
              negativeKeywords: ['limited warranty'],
            },
          ],
        },
        {
          question: 'Key pros/cons?',
          results: [
            {
              model: 'ChatGPT‑4o',
              sentiment: '+0.30',
              status: 'green',
              positiveKeywords: ['sustainable'],
              negativeKeywords: ['limited options'],
            },
            {
              model: 'Claude 3',
              sentiment: '+0.15',
              status: 'yellow',
              keywords: 'durable vs expensive',
            },
            {
              model: 'Mistral Large',
              sentiment: '+0.20',
              status: 'green',
              keywords: 'service vs availability',
            },
            {
              model: 'Gemini 1.5 Pro',
              sentiment: '-0.10',
              status: 'red',
              keywords: 'easy to use vs quality concerns',
            },
          ],
        },
        {
          question: 'Why choose …?',
          results: [
            {
              model: 'ChatGPT‑4o',
              sentiment: '+0.40',
              status: 'green',
              keywords: 'environmental impact, quality',
            },
            {
              model: 'Claude 3',
              sentiment: '+0.25',
              status: 'green',
              keywords: 'customer service, reliability',
            },
            {
              model: 'Mistral Large',
              sentiment: '+0.15',
              status: 'yellow',
              keywords: 'brand reputation',
            },
            {
              model: 'Gemini 1.5 Pro',
              sentiment: '+0.10',
              status: 'yellow',
              keywords: 'convenience, price',
            },
          ],
        },
      ],
    },
    accord: {
      attributes: [
        { name: 'Sustainability', rate: '64%', alignment: '✅' },
        { name: 'Affordability', rate: '42%', alignment: '⚠️' },
        { name: 'Trust', rate: '78%', alignment: '✅' },
        { name: 'Circular Economy', rate: '35%', alignment: '❌' },
        { name: 'Warranty', rate: '28%', alignment: '❌' },
      ],
      score: { value: '6.2/10', status: 'yellow' },
    },
    arena: {
      competitors: [
        {
          name: 'Back Market',
          chatgpt: 1,
          claude: 1,
          mistral: 2,
          gemini: 2,
          global: '56%',
          size: 'lg',
          sentiment: 'positive',
        },
        {
          name: 'Amazon Renewed',
          chatgpt: 2,
          claude: 2,
          mistral: 1,
          gemini: 1,
          global: '55%',
          size: 'lg',
          sentiment: 'positive',
        },
        {
          name: 'Swappie',
          chatgpt: 3,
          claude: 4,
          mistral: 3,
          gemini: 3,
          global: '42%',
          size: 'md',
          sentiment: 'neutral',
        },
        {
          name: 'Gazelle',
          chatgpt: 4,
          claude: 3,
          mistral: 5,
          gemini: 4,
          global: '38%',
          size: 'sm',
          sentiment: 'neutral',
        },
        {
          name: 'eBay',
          chatgpt: 5,
          claude: 5,
          mistral: 4,
          gemini: 5,
          global: '35%',
          size: 'sm',
          sentiment: 'negative',
        },
      ],
      battle: {
        competitors: [
          {
            name: 'Back Market',
            comparisons: [
              {
                model: 'ChatGPT‑4o',
                positives: ['lower defect rate', 'longer warranty'],
                negatives: ['smaller catalogue'],
              },
              {
                model: 'Claude 3',
                positives: ['more rigorous testing', 'eco-friendly packaging'],
                negatives: ['slower shipping times'],
              },
              {
                model: 'Mistral Large',
                positives: ['better customer service', 'quality guarantee'],
                negatives: ['higher price point'],
              },
              {
                model: 'Gemini 1.5 Pro',
                positives: ['transparent sourcing', 'detailed product specs'],
                negatives: ['fewer payment options'],
              },
            ],
          },
          {
            name: 'Amazon Renewed',
            comparisons: [
              {
                model: 'ChatGPT‑4o',
                positives: ['better quality control', 'longer warranty'],
                negatives: ['higher prices', 'smaller selection'],
              },
              {
                model: 'Claude 3',
                positives: ['more eco-friendly', 'better customer service'],
                negatives: ['slower delivery'],
              },
              {
                model: 'Mistral Large',
                positives: ['more detailed product information', 'better return policy'],
                negatives: ['less brand variety'],
              },
              {
                model: 'Gemini 1.5 Pro',
                positives: ['more transparent refurbishment process', 'better packaging'],
                negatives: ['more expensive shipping'],
              },
            ],
          },
        ],
        chatgpt: {
          positives: ['lower defect rate', 'longer warranty', 'better customer service'],
          negatives: ['smaller catalogue', 'higher price point'],
        },
        claude: {
          positives: ['more rigorous testing', 'eco-friendly packaging'],
          negatives: ['slower shipping times', 'fewer payment options'],
        },
      },
    },
  };

  return (
    <Layout>
      {/* View in browser link */}
      <Section className="bg-gray-100 py-2 px-4 text-center">
        <Text className="text-xs text-gray-500 m-0">
          Can't see this email correctly?{' '}
          <Link href="#" className="text-[#1976D2] underline">
            View in browser
          </Link>
        </Text>
      </Section>

      {/* Header */}
      <Header />

      {/* Main Content */}
      <Section
        style={{
          background: '#fff',
          padding: 24,
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(16,30,54,0.04)',
          margin: '24px 0',
        }}
      >
        {/* Introduction */}
        <Section
          style={{
            marginBottom: 48,
            background: '#f8fafc',
            padding: 24,
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(16,30,54,0.04)',
          }}
        >
          <Text
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: 12,
              marginTop: 0,
            }}
          >
            Mint Report
          </Text>
          <Text style={{ color: '#475569', lineHeight: 1.6, margin: 0 }}>
            This report analyzes how your brand is perceived across leading AI models. It measures
            visibility, sentiment, brand compliance, and competitive positioning to help you
            optimize your digital presence in the age of AI.
          </Text>
        </Section>

        {/* Report Sections */}
        <Section
          style={{
            marginBottom: 32,
            background: '#f8fafc',
            padding: 24,
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            boxShadow: '0 2px 8px rgba(16,30,54,0.04)',
          }}
        >
          <ReportHeader brand={reportData.brand} metadata={reportData.metadata} />
        </Section>
        <ExecutiveSummary kpi={reportData.kpi} />
        {/* <PulseSection data={reportData.pulse} /> */}
        {/* <ToneSection data={reportData.tone} /> */}
        <AccordSection data={reportData.accord} />
        {reportData.arena && <ArenaSection data={reportData.arena} />}
        {reportData.arena.battle && <ArenaBattleSection data={reportData.arena.battle} />}
      </Section>

      {/* Footer */}
      <Footer />
    </Layout>
  );
};

export default BrandIntelligenceReport;
