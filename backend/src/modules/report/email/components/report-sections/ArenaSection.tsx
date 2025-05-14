import React from 'react';
import {
  Section,
  Row,
  Column,
  Heading,
  Text,
  Hr
} from '@react-email/components';
import { ArenaSectionProps, CompetitorData } from '../../utils/types';

export const ArenaSection: React.FC<ArenaSectionProps> = ({ data }) => {
  // Helper function for sentiment colors
  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative'): string => {
    return sentiment === "positive" 
      ? "#0D9488" 
      : sentiment === "neutral" 
        ? "#6366F1" 
        : "#EF4444";
  };

  // Helper function for size classes
  const getSizeClass = (size: 'lg' | 'md' | 'sm'): { width: string; height: string; fontSize: string } => {
    return size === "lg" 
      ? { width: '40px', height: '40px', fontSize: '16px' }
      : size === "md" 
        ? { width: '34px', height: '34px', fontSize: '14px' }
        : { width: '28px', height: '28px', fontSize: '12px' };
  };

  // Format rank position
  const formatRank = (rank: number): string => {
    return rank === 1 ? "1st" : rank === 2 ? "2nd" : rank === 3 ? "3rd" : `${rank}th`;
  };

  return (
    <Section className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <Section className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <Row>
          <Column>
            <Heading as="h2" className="text-xl font-bold text-gray-900 m-0">Arena — Competitive Landscape</Heading>
            <Text className="text-sm text-gray-600 mt-1 m-0">
              How AI models position your brand relative to competitors.
            </Text>
          </Column>
        </Row>
      </Section>

      <Section className="p-6">
        <Text className="text-lg font-semibold text-gray-800 mb-6 m-0">Top Competing Brands</Text>
        
        <Section className="mb-8">
          <Row className="border-b border-gray-200 pb-3 mb-3">
            <Column className="w-2/5">
              <Text className="text-sm font-medium text-gray-500 m-0">Brand</Text>
            </Column>
            <Column className="w-1/5 text-center">
              <Text className="text-sm font-medium text-gray-500 m-0">Global</Text>
            </Column>
            <Column className="w-2/5 text-center">
              <Text className="text-sm font-medium text-gray-500 m-0">Ranking by Model</Text>
            </Column>
          </Row>

          {data.competitors.map((competitor: CompetitorData, index: number) => (
            <Row key={index} className="py-3 border-b border-gray-100">
              <Column className="w-2/5">
                <Row>
                  <Column className="pr-3">
                    <div style={{
                      width: getSizeClass(competitor.size).width,
                      height: getSizeClass(competitor.size).height,
                      backgroundColor: getSentimentColor(competitor.sentiment),
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: getSizeClass(competitor.size).fontSize
                    }}>
                      {index + 1}
                    </div>
                  </Column>
                  <Column>
                    <Text className="text-sm font-medium text-gray-800 m-0">{competitor.name}</Text>
                    <Text className="text-xs text-gray-500 m-0">
                      {competitor.sentiment.charAt(0).toUpperCase() + competitor.sentiment.slice(1)} sentiment
                    </Text>
                  </Column>
                </Row>
              </Column>
              <Column className="w-1/5 text-center">
                <Text className="text-sm font-bold m-0" style={{ color: getSentimentColor(competitor.sentiment) }}>
                  {competitor.global}
                </Text>
              </Column>
              <Column className="w-2/5">
                <Row>
                  <Column className="w-1/4 text-center">
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: competitor.chatgpt <= 3 ? '#E3F2FD' : '#F3F4F6',
                      display: 'inline-block'
                    }}>
                      <Text className="text-xs font-medium m-0" style={{ 
                        color: competitor.chatgpt <= 3 ? '#1976D2' : '#6B7280'
                      }}>
                        {formatRank(competitor.chatgpt)}
                      </Text>
                    </div>
                    <Text className="text-xs text-gray-500 mt-1 m-0">GPT</Text>
                  </Column>
                  <Column className="w-1/4 text-center">
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: competitor.claude <= 3 ? '#E3F2FD' : '#F3F4F6',
                      display: 'inline-block'
                    }}>
                      <Text className="text-xs font-medium m-0" style={{ 
                        color: competitor.claude <= 3 ? '#1976D2' : '#6B7280'
                      }}>
                        {formatRank(competitor.claude)}
                      </Text>
                    </div>
                    <Text className="text-xs text-gray-500 mt-1 m-0">Claude</Text>
                  </Column>
                  <Column className="w-1/4 text-center">
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: competitor.mistral <= 3 ? '#E3F2FD' : '#F3F4F6',
                      display: 'inline-block'
                    }}>
                      <Text className="text-xs font-medium m-0" style={{ 
                        color: competitor.mistral <= 3 ? '#1976D2' : '#6B7280'
                      }}>
                        {formatRank(competitor.mistral)}
                      </Text>
                    </div>
                    <Text className="text-xs text-gray-500 mt-1 m-0">Mistral</Text>
                  </Column>
                  <Column className="w-1/4 text-center">
                    <div style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: competitor.gemini <= 3 ? '#E3F2FD' : '#F3F4F6',
                      display: 'inline-block'
                    }}>
                      <Text className="text-xs font-medium m-0" style={{ 
                        color: competitor.gemini <= 3 ? '#1976D2' : '#6B7280'
                      }}>
                        {formatRank(competitor.gemini)}
                      </Text>
                    </div>
                    <Text className="text-xs text-gray-500 mt-1 m-0">Gemini</Text>
                  </Column>
                </Row>
              </Column>
            </Row>
          ))}
        </Section>

        <Hr className="border-gray-100 mb-6" />

        <Section>
          <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">Competition Analysis</Text>
          
          <Row>
            <Column className="w-1/2 pr-4">
              <Text className="text-sm text-gray-600 mb-4 m-0">
                The Arena score measures your brand's competitive positioning across AI models. Higher rankings 
                indicate that AI models are more likely to recommend your brand over competitors.
              </Text>
              <Text className="text-sm text-gray-600 m-0">
                Competitor sentiment analysis reveals whether AI models discuss your competitors in 
                positive, neutral, or negative terms when compared to your brand.
              </Text>
            </Column>
            <Column className="w-1/2 pl-4">
              <Section className="bg-gray-50 border border-gray-100 rounded-lg p-4">
                <Text className="text-sm font-medium text-gray-800 mb-2 m-0">Key Insights:</Text>
                <ul style={{ 
                  margin: '0',
                  paddingLeft: '16px',
                  listStyleType: 'disc'
                }}>
                  {data.competitors.length > 0 && (
                    <li style={{ color: '#4B5563', fontSize: '14px', marginBottom: '4px' }}>
                      <Text className="text-sm text-gray-600 m-0">
                        {data.competitors[0].name} is your strongest competitor across all models
                      </Text>
                    </li>
                  )}
                  {data.competitors.length > 0 && (
                    <li style={{ color: '#4B5563', fontSize: '14px', marginBottom: '4px' }}>
                      <Text className="text-sm text-gray-600 m-0">
                        Your brand ranks highest on {data.competitors[0].chatgpt === 1 ? "ChatGPT" : data.competitors[0].claude === 1 ? "Claude" : "Mistral"}
                      </Text>
                    </li>
                  )}
                  {data.competitors.length >= 5 && data.competitors[4].sentiment === 'negative' && (
                    <li style={{ color: '#4B5563', fontSize: '14px' }}>
                      <Text className="text-sm text-gray-600 m-0">
                        {data.competitors[4].name} is shown with negative sentiment
                      </Text>
                    </li>
                  )}
                  {(data.competitors.length < 5 || data.competitors[4].sentiment !== 'negative') && 
                    data.competitors.some((comp: CompetitorData) => comp.sentiment === 'negative') && (
                    <li style={{ color: '#4B5563', fontSize: '14px' }}>
                      <Text className="text-sm text-gray-600 m-0">
                        {data.competitors.find((comp: CompetitorData) => comp.sentiment === 'negative')?.name} is shown with negative sentiment
                      </Text>
                    </li>
                  )}
                </ul>
              </Section>
            </Column>
          </Row>
        </Section>
      </Section>
    </Section>
  );
};

export default ArenaSection;