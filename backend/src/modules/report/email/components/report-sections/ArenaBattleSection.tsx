import React from 'react';
import {
  Section,
  Row,
  Column,
  Heading,
  Text,
  Hr
} from '@react-email/components';
import { ArenaBattleSectionProps } from '../../utils/types';

export const ArenaBattleSection: React.FC<ArenaBattleSectionProps> = ({ data }) => {
  return (
    <Section className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <Section className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <Row>
          <Column>
            <Heading as="h2" className="text-xl font-bold text-gray-900 m-0">Competitive Analysis</Heading>
            <Text className="text-sm text-gray-600 mt-1 m-0">
              Detailed comparison of your brand against key competitors across AI models.
            </Text>
          </Column>
        </Row>
      </Section>

      <Section className="p-6">
        {data.competitors.slice(0, 2).map((competitor: { name: string; comparisons: { model: string; positives: string[]; negatives: string[] }[] }, index: number) => (
          <Section key={index} className="mb-10">
            <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">
              vs. {competitor.name}
            </Text>
            
            <Row>
              {competitor.comparisons.map((comparison: { model: string; positives: string[]; negatives: string[] }, cIndex: number) => (
                <Column key={cIndex} className="w-1/4 px-2">
                  <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      backgroundColor: '#f9fafb',
                      padding: '10px',
                      borderBottom: '1px solid #e5e7eb'
                    }}>
                      <Text className="text-sm font-medium text-gray-800 m-0">{comparison.model}</Text>
                    </div>
                    
                    <div style={{ padding: '12px' }}>
                      <Text className="text-xs font-medium text-gray-500 mb-2 m-0">Your brand advantages:</Text>
                      <ul style={{ 
                        margin: '0 0 12px 0',
                        paddingLeft: '16px',
                        listStyleType: 'disc'
                      }}>
                        {comparison.positives.map((positive: string, pIndex: number) => (
                          <li key={pIndex} style={{ color: '#0D9488', marginBottom: '4px' }}>
                            <Text className="text-xs text-gray-700 m-0">{positive}</Text>
                          </li>
                        ))}
                      </ul>
                      
                      <Text className="text-xs font-medium text-gray-500 mb-2 m-0">Competitor advantages:</Text>
                      <ul style={{ 
                        margin: '0',
                        paddingLeft: '16px',
                        listStyleType: 'disc'
                      }}>
                        {comparison.negatives.map((negative: string, nIndex: number) => (
                          <li key={nIndex} style={{ color: '#EF4444', marginBottom: '4px' }}>
                            <Text className="text-xs text-gray-700 m-0">{negative}</Text>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Column>
              ))}
            </Row>
          </Section>
        ))}

        <Hr className="border-gray-100 mb-6" />
        
        <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">Global Competitive Advantages</Text>
        
        <Row>
          <Column className="w-1/2 pr-3">
            <div style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #DCFCE7',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <Text className="text-sm font-medium text-green-800 mb-3 m-0">Your Brand Advantages</Text>
              
              <ul style={{ 
                margin: '0',
                paddingLeft: '16px',
                listStyleType: 'disc'
              }}>
                {data.chatgpt.positives.map((positive: string, index: number) => (
                  <li key={index} style={{ color: '#0D9488', marginBottom: '6px' }}>
                    <Text className="text-sm text-gray-800 m-0">{positive}</Text>
                  </li>
                ))}
              </ul>
            </div>
          </Column>
          
          <Column className="w-1/2 pl-3">
            <div style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FEE2E2',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <Text className="text-sm font-medium text-red-800 mb-3 m-0">Competitor Advantages</Text>
              
              <ul style={{ 
                margin: '0',
                paddingLeft: '16px',
                listStyleType: 'disc'
              }}>
                {data.chatgpt.negatives.map((negative: string, index: number) => (
                  <li key={index} style={{ color: '#EF4444', marginBottom: '6px' }}>
                    <Text className="text-sm text-gray-800 m-0">{negative}</Text>
                  </li>
                ))}
              </ul>
            </div>
          </Column>
        </Row>
        
        <Section className="mt-6">
          <Text className="text-sm text-gray-600 m-0">
            This analysis captures how AI models compare your brand to competitors when directly asked. 
            It highlights the key differentiators that AI associates with your brand (positives) and areas 
            where competitors are perceived to have advantages (negatives).
          </Text>
        </Section>
      </Section>
    </Section>
  );
};

export default ArenaBattleSection;