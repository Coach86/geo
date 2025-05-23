import React from 'react';
import { Section, Row, Column, Heading, Text, Hr } from '@react-email/components';
import { PulseSectionProps, ModelVisibility } from '../../utils/types';

export const PulseSection: React.FC<PulseSectionProps> = ({ data }) => {
  // Sort data by value in descending order, but keep Global Avg at the end
  const sortedData = [...data.modelVisibility].sort(
    (a: ModelVisibility, b: ModelVisibility) => b.value - a.value,
  );

  // Get global average value
  const globalAvg = data.modelVisibility;
  const globalAvgValue = 0;

  return (
    <Section className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <Section className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <Row>
          <Column>
            <Heading as="h2" className="text-xl font-bold text-gray-900 m-0">
              Pulse — Brand Visibility
            </Heading>
            <Text className="text-sm text-gray-600 mt-1 m-0">
              The percentage of times your brand is mentioned by AI when asked about your industry.
            </Text>
          </Column>
        </Row>
      </Section>

      <Section className="p-6">
        <Row className="mb-8">
          <Column>
            <Row className="mb-1">
              <Column>
                <Text className="text-3xl font-bold text-gray-900 m-0">{globalAvgValue}%</Text>
                <Text className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full inline-block">
                  Global Average
                </Text>
              </Column>
            </Row>
          </Column>
          <Column className="text-right">
            <Text className="text-sm font-medium text-gray-900 m-0">Prompts Tested</Text>
            <Text className="text-2xl font-bold text-gray-900 m-0">{data.promptsTested}</Text>
          </Column>
        </Row>

        <Section className="mb-6">
          <Heading as="h4" className="text-lg font-semibold text-gray-800 mb-4 m-0">
            Model Breakdown
          </Heading>

          {/* Custom bar chart implementation for email */}
          <Section>
            {sortedData.map((model: ModelVisibility, index: number) => (
              <Row key={index} className="mb-3">
                <Column className="w-1/4">
                  <Text className="text-sm font-medium text-gray-800 m-0">{model.model}</Text>
                </Column>
                <Column className="w-3/4">
                  <Row>
                    <Column className="w-full">
                      <div
                        style={{
                          position: 'relative',
                          height: '30px',
                          width: '100%',
                          backgroundColor: '#f3f4f6',
                          borderRadius: '4px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            width: `${model.value}%`,
                            backgroundColor: '#3182CE',
                            borderRadius: '4px 0 0 4px',
                          }}
                        ></div>
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            left: `${model.value}%`,
                            marginLeft: '-3px',
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: 'black',
                          }}
                        ></div>
                        <Text
                          style={{
                            position: 'absolute',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            right: '10px',
                            margin: 0,
                            color: '#111827',
                            fontWeight: 600,
                            fontSize: '14px',
                          }}
                        >
                          {model.value}%
                        </Text>
                      </div>
                    </Column>
                  </Row>
                </Column>
              </Row>
            ))}
          </Section>
        </Section>

        <Hr className="border-gray-100 mb-6 mt-6" />

        <Section>
          <Heading as="h4" className="text-lg font-semibold text-gray-800 mb-4 m-0">
            What is Pulse Score?
          </Heading>
          <Text className="text-gray-600 mb-4 m-0">
            Pulse score (%) = Total mention rate of your brand across all responses generated by AI
            models when asked about your industry or product category.
          </Text>

          <Section className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <Row>
              <Column className="w-1/12">
                <Text className="text-blue-500 m-0">ℹ️</Text>
              </Column>
              <Column className="w-11/12">
                <Text className="text-sm font-medium text-blue-800 m-0">Methodology</Text>
                <ul
                  style={{
                    marginTop: '4px',
                    paddingLeft: '20px',
                    fontSize: '14px',
                    color: '#1e40af',
                    listStyleType: 'disc',
                  }}
                >
                  <li>Unique prompts tested = 15</li>
                  <li>Sequences run = 3</li>
                  <li>Total "Pulse" responses generated by model = 45</li>
                  <li>225 responses across all models tested</li>
                </ul>
              </Column>
            </Row>
          </Section>
        </Section>
      </Section>
    </Section>
  );
};

export default PulseSection;
