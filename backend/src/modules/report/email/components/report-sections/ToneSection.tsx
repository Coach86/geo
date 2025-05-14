import React from 'react';
import {
  Section,
  Row,
  Column,
  Heading,
  Text,
  Hr
} from '@react-email/components';
import { ToneSectionProps, SentimentData } from '../../utils/types';

export const ToneSection: React.FC<ToneSectionProps> = ({ data }) => {
  // Helper functions for sentiment colors
  const getSentimentColor = (status: 'green' | 'yellow' | 'red'): string => {
    return status === "green" 
      ? "#0D47A1" 
      : status === "yellow" 
        ? "#4527A0" 
        : "#AD1457";
  };

  const getSentimentBgColor = (status: 'green' | 'yellow' | 'red'): string => {
    return status === "green" 
      ? "#E3F2FD" 
      : status === "yellow" 
        ? "#EDE7F6" 
        : "#FCE4EC";
  };

  // Find the average sentiment
  const globalAvg = data.sentiments.find((item: SentimentData) => item.isAverage) as SentimentData;

  return (
    <Section className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <Section className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <Row>
          <Column>
            <Heading as="h2" className="text-xl font-bold text-gray-900 m-0">Tone — Brand Perception</Heading>
            <Text className="text-sm text-gray-600 mt-1 m-0">
              How positively or negatively AI models describe your brand across various prompts.
            </Text>
          </Column>
        </Row>
      </Section>

      <Section className="p-6">
        {/* Sentiment Overview Section */}
        <Row className="mb-10">
          <Column className="w-1/2">
            <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">Sentiment Overview</Text>
            
            <Row>
              <Column>
                <Row>
                  <Column className="w-full">
                    <div style={{ 
                      padding: '10px',
                      borderRadius: '8px',
                      backgroundColor: getSentimentBgColor(globalAvg.status),
                      marginBottom: '16px'
                    }}>
                      <Text className="text-3xl m-0 font-bold" style={{ color: getSentimentColor(globalAvg.status) }}>
                        {globalAvg.sentiment}
                      </Text>
                      <Text className="text-sm m-0" style={{ color: getSentimentColor(globalAvg.status) }}>
                        Global Average Sentiment
                      </Text>
                    </div>
                  </Column>
                </Row>
                
                <Row>
                  <Column className="w-1/2 pr-2">
                    <Text className="text-sm font-medium text-gray-500 mb-1 m-0">Most Positive</Text>
                    <div style={{ 
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: '#E3F2FD',
                      marginBottom: '8px'
                    }}>
                      <Text className="text-sm font-bold m-0" style={{ color: '#0D47A1' }}>
                        {data.sentiments[0].model}
                      </Text>
                      <Text className="text-lg font-bold m-0" style={{ color: '#0D47A1' }}>
                        {data.sentiments[0].sentiment}
                      </Text>
                    </div>
                  </Column>
                  <Column className="w-1/2 pl-2">
                    <Text className="text-sm font-medium text-gray-500 mb-1 m-0">Least Positive</Text>
                    <div style={{ 
                      padding: '8px',
                      borderRadius: '6px',
                      backgroundColor: getSentimentBgColor(data.sentiments[2].status),
                      marginBottom: '8px'
                    }}>
                      <Text className="text-sm font-bold m-0" style={{ color: getSentimentColor(data.sentiments[2].status) }}>
                        {data.sentiments[2].model}
                      </Text>
                      <Text className="text-lg font-bold m-0" style={{ color: getSentimentColor(data.sentiments[2].status) }}>
                        {data.sentiments[2].sentiment}
                      </Text>
                    </div>
                  </Column>
                </Row>
              </Column>
            </Row>
          </Column>

          <Column className="w-1/2 pl-4">
            <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">Model Breakdown</Text>
            
            <Section>
              {data.sentiments.filter((item: SentimentData) => !item.isAverage).map((sentiment: SentimentData, index: number) => (
                <Row key={index} className="mb-4">
                  <Column className="w-1/3">
                    <Text className="text-sm font-medium text-gray-800 m-0">{sentiment.model}</Text>
                  </Column>
                  <Column className="w-2/3">
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      backgroundColor: getSentimentBgColor(sentiment.status)
                    }}>
                      <Row>
                        <Column>
                          <Text className="text-lg font-bold m-0" style={{ color: getSentimentColor(sentiment.status) }}>
                            {sentiment.sentiment}
                          </Text>
                        </Column>
                        <Column className="text-right">
                          <Text className="text-xs m-0" style={{ color: getSentimentColor(sentiment.status) }}>
                            {sentiment.status === "green" ? "Positive" : sentiment.status === "yellow" ? "Neutral" : "Negative"}
                          </Text>
                        </Column>
                      </Row>
                    </div>
                  </Column>
                </Row>
              ))}
            </Section>
          </Column>
        </Row>

        <Hr className="border-gray-100 my-6" />

        {/* Keywords Section */}
        <Section className="mb-6">
          <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">Common Keywords by Model</Text>
          
          <Row>
            {data.sentiments.filter((item: SentimentData) => !item.isAverage).map((sentiment: SentimentData, index: number) => (
              <Column key={index} className="w-1/3 px-2">
                <div style={{ 
                  border: '1px solid',
                  borderColor: getSentimentColor(sentiment.status),
                  borderRadius: '8px',
                  padding: '12px',
                  height: '100%'
                }}>
                  <Text className="font-bold mb-2 m-0" style={{ color: getSentimentColor(sentiment.status) }}>
                    {sentiment.model}
                  </Text>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <Text className="text-xs font-medium text-gray-500 mb-1 m-0">Positives:</Text>
                    <Text className="text-sm m-0">
                      {sentiment.positives}
                    </Text>
                  </div>
                  
                  <div>
                    <Text className="text-xs font-medium text-gray-500 mb-1 m-0">Negatives:</Text>
                    <Text className="text-sm m-0">
                      {sentiment.negatives}
                    </Text>
                  </div>
                </div>
              </Column>
            ))}
          </Row>
        </Section>

        <Hr className="border-gray-100 my-6" />

        {/* Question Breakdown */}
        <Section>
          <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">Question Breakdown</Text>
          
          {data.questions.map((question: { question: string; results: { model: string; sentiment: string; status: 'green' | 'yellow' | 'red'; keywords: string }[] }, qIndex: number) => (
            <Section key={qIndex} className="mb-6">
              <Text className="font-medium text-gray-700 mb-3 m-0">"{question.question}"</Text>
              
              <Row>
                {question.results.map((result: { model: string; sentiment: string; status: 'green' | 'yellow' | 'red'; keywords: string }, rIndex: number) => (
                  <Column key={rIndex} className="w-1/4 px-2">
                    <div style={{ 
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: result.status === "green" ? '#90CAF9' : result.status === "yellow" ? '#B39DDB' : '#F48FB1'
                    }}>
                      <div style={{
                        padding: '8px 12px',
                        backgroundColor: getSentimentBgColor(result.status)
                      }}>
                        <Text className="text-sm font-bold m-0" style={{ color: getSentimentColor(result.status) }}>
                          {result.model}
                        </Text>
                      </div>
                      
                      <div style={{ padding: '10px' }}>
                        <Text className="text-lg font-bold mb-2 m-0" style={{ color: getSentimentColor(result.status) }}>
                          {result.sentiment}
                        </Text>
                        <Text className="text-xs text-gray-600 m-0">
                          {result.keywords}
                        </Text>
                      </div>
                    </div>
                  </Column>
                ))}
              </Row>
            </Section>
          ))}
        </Section>
      </Section>
    </Section>
  );
};

export default ToneSection;