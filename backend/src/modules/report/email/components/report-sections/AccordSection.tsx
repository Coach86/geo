import React from 'react';
import {
  Section,
  Row,
  Column,
  Heading,
  Text,
  Hr
} from '@react-email/components';
import { AccordSectionProps } from '../../utils/types';

export const AccordSection: React.FC<AccordSectionProps> = ({ data }) => {
  // Helper functions for status colors
  const getStatusColor = (status: 'green' | 'yellow' | 'red'): string => {
    return status === "green" 
      ? "#0D47A1" 
      : status === "yellow" 
        ? "#4527A0" 
        : "#AD1457";
  };

  const getStatusBgColor = (status: 'green' | 'yellow' | 'red'): string => {
    return status === "green" 
      ? "#E3F2FD" 
      : status === "yellow" 
        ? "#EDE7F6" 
        : "#FCE4EC";
  };

  // Helper for alignment icon
  const getAlignmentIcon = (alignment: '✅' | '⚠️' | '❌'): string => {
    return alignment === "✅" ? "✅" : alignment === "⚠️" ? "⚠️" : "❌";
  };

  // Helper for alignment color
  const getAlignmentColor = (alignment: '✅' | '⚠️' | '❌'): string => {
    return alignment === "✅" ? "#0D9488" : alignment === "⚠️" ? "#F59E0B" : "#EF4444";
  };

  return (
    <Section className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <Section className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <Row>
          <Column>
            <Heading as="h2" className="text-xl font-bold text-gray-900 m-0">Accord — Brand Compliance</Heading>
            <Text className="text-sm text-gray-600 mt-1 m-0">
              How well AI models align with your brand's self-described attributes.
            </Text>
          </Column>
        </Row>
      </Section>

      <Section className="p-6">
        <Row className="mb-8">
          <Column className="w-2/3">
            <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">Brand Attribute Compliance</Text>
            
            <Section>
              <Row className="border-b border-gray-200 pb-2 mb-2">
                <Column className="w-2/5">
                  <Text className="text-sm font-medium text-gray-500 m-0">Attribute</Text>
                </Column>
                <Column className="w-1/5 text-center">
                  <Text className="text-sm font-medium text-gray-500 m-0">Rate</Text>
                </Column>
                <Column className="w-1/5 text-center">
                  <Text className="text-sm font-medium text-gray-500 m-0">Status</Text>
                </Column>
                <Column className="w-1/5">
                  {/* Empty header for spacing */}
                </Column>
              </Row>

              {data.attributes.map((attribute: { name: string; rate: string; alignment: '✅' | '⚠️' | '❌' }, index: number) => (
                <Row key={index} className="py-2 border-b border-gray-100">
                  <Column className="w-2/5">
                    <Text className="text-sm font-medium text-gray-800 m-0">{attribute.name}</Text>
                  </Column>
                  <Column className="w-1/5 text-center">
                    <Text className="text-sm font-medium text-gray-800 m-0">{attribute.rate}</Text>
                  </Column>
                  <Column className="w-1/5 text-center">
                    <Text className="text-lg m-0" style={{ lineHeight: 1 }}>
                      {getAlignmentIcon(attribute.alignment)}
                    </Text>
                  </Column>
                  <Column className="w-1/5">
                    <div style={{
                      width: '100%',
                      height: '6px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '3px'
                    }}>
                      <div style={{
                        width: attribute.rate,
                        height: '100%',
                        backgroundColor: getAlignmentColor(attribute.alignment),
                        borderRadius: '3px'
                      }}></div>
                    </div>
                  </Column>
                </Row>
              ))}
            </Section>
          </Column>

          <Column className="w-1/3 pl-6">
            <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">Global Score</Text>
            
            <Section>
              <div style={{
                padding: '24px',
                borderRadius: '12px',
                backgroundColor: getStatusBgColor(data.score.status),
                textAlign: 'center',
                marginBottom: '16px'
              }}>
                <Text className="text-4xl font-bold m-0" style={{ color: getStatusColor(data.score.status) }}>
                  {data.score.value}
                </Text>
                <Text className="text-sm m-0" style={{ color: getStatusColor(data.score.status) }}>
                  Brand Compliance Score
                </Text>
              </div>

              <div style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb'
              }}>
                <Text className="text-sm text-gray-600 m-0">
                  <strong>Legend:</strong>
                </Text>
                <div style={{ marginTop: '8px' }}>
                  <Row className="mb-2">
                    <Column className="w-1/6">
                      <Text className="text-lg m-0">✅</Text>
                    </Column>
                    <Column className="w-5/6">
                      <Text className="text-sm text-gray-700 m-0">Strong alignment (75%+)</Text>
                    </Column>
                  </Row>
                  <Row className="mb-2">
                    <Column className="w-1/6">
                      <Text className="text-lg m-0">⚠️</Text>
                    </Column>
                    <Column className="w-5/6">
                      <Text className="text-sm text-gray-700 m-0">Partial alignment (40-74%)</Text>
                    </Column>
                  </Row>
                  <Row>
                    <Column className="w-1/6">
                      <Text className="text-lg m-0">❌</Text>
                    </Column>
                    <Column className="w-5/6">
                      <Text className="text-sm text-gray-700 m-0">Poor alignment (0-39%)</Text>
                    </Column>
                  </Row>
                </div>
              </div>
            </Section>
          </Column>
        </Row>

        <Hr className="border-gray-100 mb-6" />

        <Section>
          <Text className="text-lg font-semibold text-gray-800 mb-4 m-0">What is Accord Score?</Text>
          <Text className="text-gray-600 mb-4 m-0">
            Accord Score measures how consistently AI models represent your brand in alignment with your 
            declared brand attributes. It's derived from analysis of responses against key attributes your brand 
            has identified as core to its identity.
          </Text>
          <Text className="text-gray-600 m-0">
            A higher score (closer to 10) indicates stronger alignment between how your brand wants to be perceived 
            and how AI models are actually representing it.
          </Text>
        </Section>
      </Section>
    </Section>
  );
};

export default AccordSection;