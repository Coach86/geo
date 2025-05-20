import React from 'react';
import { Section, Row, Column, Heading, Text, Hr } from '@react-email/components';
import { ExecutiveSummaryProps } from '../../utils/types';

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ kpi }) => {
  // Helper function to extract numeric value from KPI
  const getNumericValue = (value: string): number => {
    return Number.parseFloat(value.replace(/[^0-9.]/g, ''));
  };

  // Calculate percentages for progress bars
  const pulsePercentage = getNumericValue(kpi.pulse.value);

  // Convert tone value from -1.0 to +1.0 to percentage (0 to 100%)
  const toneValue = kpi.tone.value.includes('+')
    ? getNumericValue(kpi.tone.value)
    : kpi.tone.value.includes('-')
      ? -getNumericValue(kpi.tone.value)
      : 0;

  const tonePercentage = Math.round((toneValue + 1) * 50);

  // Calculate accord percentage
  const accordPercentage = getNumericValue(kpi.accord.value) * 10; // Assuming it's on a scale of 10

  // Color configurations based on status
  const getToneColors = (status: string): { primary: string; secondary: string } => {
    return status === 'green'
      ? { primary: '#0D47A1', secondary: '#2196F3' }
      : status === 'yellow'
        ? { primary: '#4527A0', secondary: '#673AB7' }
        : { primary: '#AD1457', secondary: '#C2185B' };
  };

  const getAccordColors = (status: string): { primary: string; secondary: string } => {
    return status === 'green'
      ? { primary: '#0D47A1', secondary: '#2196F3' }
      : status === 'yellow'
        ? { primary: '#4527A0', secondary: '#673AB7' }
        : { primary: '#AD1457', secondary: '#C2185B' };
  };

  const toneColors = getToneColors(kpi.tone.status);
  const accordColors = getAccordColors(kpi.accord.status);

  // Calculate the percentage as an integer for table cell width
  const pulseInt = Math.round(pulsePercentage);

  return (
    <Section className="mb-8 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <Section className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <Heading as="h2" className="text-xl font-bold text-gray-900 m-0">
          Executive Summary
        </Heading>
      </Section>

      <Section className="p-6">
        <Row>
          {/* Pulse Tile */}
          <Column className="p-2 w-1/2">
            <Section className="relative bg-white border rounded-lg shadow-sm p-5 overflow-hidden">
              {/* Colored band at top */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(to right, #3182CE, #63B3ED)',
                }}
              ></div>

              <Row className="mb-4 mt-2">
                <Column>
                  <Text className="text-sm font-bold text-gray-800 m-0">Pulse</Text>
                </Column>
              </Row>

              <Row className="mb-3">
                <Column>
                  <Text className="text-2xl font-bold text-gray-900 m-0">{kpi.pulse.value}</Text>
                </Column>
                <Column>
                  <Text className="text-sm text-gray-500 m-0">
                    visibility score{pulsePercentage}
                  </Text>
                </Column>
              </Row>

              {/* Progress bar */}
              <table
                style={{
                  width: '100%',
                  borderSpacing: 0,
                  borderCollapse: 'separate',
                  margin: '8px 0',
                }}
              >
                <tr>
                  {/* Filled part with dot */}
                  <td
                    style={{
                      padding: 0,
                      margin: 0,
                      width: `${pulseInt}%`,
                      background: 'linear-gradient(to right, #3182CE, #63B3ED)',
                      borderRadius: '9999px',
                      position: 'relative',
                      height: '8px',
                      minWidth: '8px',
                    }}
                  ></td>
                  {/* Unfilled part */}
                  <td
                    style={{
                      padding: 0,
                      margin: 0,
                      width: `${100 - pulseInt}%`,
                      background: '#e5e7eb',
                      borderRadius: '9999px',
                      height: '8px',
                      minWidth: '0',
                    }}
                  ></td>
                </tr>
              </table>

              <Row>
                <Column>
                  <Text className="text-xs text-gray-500 m-0">0%</Text>
                </Column>
                <Column className="text-right">
                  <Text className="text-xs text-gray-500 m-0">100%</Text>
                </Column>
              </Row>

              <Hr className="my-4 border-gray-200" />

              <Text className="text-sm text-gray-600 m-0">{kpi.pulse.description}</Text>
            </Section>
          </Column>

          {/* Tone Tile */}
          <Column className="p-2 w-1/2">
            <Section className="relative bg-white border rounded-lg shadow-sm p-5 overflow-hidden">
              {/* Colored band at top */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(to right, ${toneColors.primary}, ${toneColors.secondary})`,
                }}
              ></div>

              <Row className="mb-4 mt-2">
                <Column>
                  <Text className="text-sm font-bold text-gray-800 m-0">Tone</Text>
                </Column>
              </Row>

              <Row className="mb-3">
                <Column>
                  <Text className="text-2xl font-bold m-0" style={{ color: toneColors.primary }}>
                    {tonePercentage}%
                  </Text>
                </Column>
                <Column>
                  <Text className="text-sm text-gray-500 m-0">sentiment score</Text>
                </Column>
              </Row>

              {/* Progress bar */}
              <table
                style={{
                  width: '100%',
                  borderSpacing: 0,
                  borderCollapse: 'separate',
                  margin: '8px 0',
                }}
              >
                <tr>
                  {/* Filled part with dot */}
                  <td
                    style={{
                      padding: 0,
                      margin: 0,
                      width: `${tonePercentage}%`,
                      background: `linear-gradient(to right, ${toneColors.primary}, ${toneColors.secondary})`,
                      borderRadius: '9999px',
                      position: 'relative',
                      height: '8px',
                      minWidth: '8px',
                    }}
                  ></td>
                  {/* Unfilled part */}
                  <td
                    style={{
                      padding: 0,
                      margin: 0,
                      width: `${100 - tonePercentage}%`,
                      background: '#e5e7eb',
                      borderRadius: '9999px',
                      height: '8px',
                      minWidth: '0',
                    }}
                  ></td>
                </tr>
              </table>

              <Row>
                <Column>
                  <Text className="text-xs text-gray-500 m-0">0%</Text>
                </Column>
                <Column className="text-center">
                  <Text className="text-xs text-gray-500 m-0">50%</Text>
                </Column>
                <Column className="text-right">
                  <Text className="text-xs text-gray-500 m-0">100%</Text>
                </Column>
              </Row>

              <Hr className="my-4 border-gray-200" />

              <Text className="text-sm text-gray-600 m-0">{kpi.tone.description}</Text>
            </Section>
          </Column>
        </Row>

        <Row>
          {/* Accord Tile */}
          <Column className="p-2 w-1/2">
            <Section className="relative bg-white border rounded-lg shadow-sm p-5 overflow-hidden">
              {/* Colored band at top */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: `linear-gradient(to right, ${accordColors.primary}, ${accordColors.secondary})`,
                }}
              ></div>

              <Row className="mb-4 mt-2">
                <Column>
                  <Text className="text-sm font-bold text-gray-800 m-0">
                    Brand Compliance score
                  </Text>
                </Column>
              </Row>

              <Row className="mb-3">
                <Column>
                  <Text className="text-2xl font-bold m-0" style={{ color: accordColors.primary }}>
                    {kpi.accord.value}
                  </Text>
                </Column>
                <Column>
                  <Text className="text-sm text-gray-500 m-0">compliance score</Text>
                </Column>
              </Row>

              {/* Progress bar */}
              <table
                style={{
                  width: '100%',
                  borderSpacing: 0,
                  borderCollapse: 'separate',
                  margin: '8px 0',
                }}
              >
                <tr>
                  {/* Filled part with dot */}
                  <td
                    style={{
                      padding: 0,
                      margin: 0,
                      width: `${accordPercentage}%`,
                      background: `linear-gradient(to right, ${accordColors.primary}, ${accordColors.secondary})`,
                      borderRadius: '9999px',
                      position: 'relative',
                      height: '8px',
                      minWidth: '8px',
                    }}
                  ></td>
                  {/* Unfilled part */}
                  <td
                    style={{
                      padding: 0,
                      margin: 0,
                      width: `${100 - accordPercentage}%`,
                      background: '#e5e7eb',
                      borderRadius: '9999px',
                      height: '8px',
                      minWidth: '0',
                    }}
                  ></td>
                </tr>
              </table>

              <Row>
                <Column>
                  <Text className="text-xs text-gray-500 m-0">0</Text>
                </Column>
                <Column className="text-center">
                  <Text className="text-xs text-gray-500 m-0">5</Text>
                </Column>
                <Column className="text-right">
                  <Text className="text-xs text-gray-500 m-0">10</Text>
                </Column>
              </Row>

              <Hr className="my-4 border-gray-200" />

              <Text className="text-sm text-gray-600 m-0">{kpi.accord.description}</Text>
            </Section>
          </Column>

          {/* Arena Tile */}
          <Column className="p-2 w-1/2">
            <Section className="relative bg-white border rounded-lg shadow-sm p-5 overflow-hidden">
              {/* Colored band at top */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 'linear-gradient(to right, #805AD5, #B794F4)',
                }}
              ></div>

              <Row className="mb-4 mt-2">
                <Column>
                  <Text className="text-sm font-bold text-gray-800 m-0">Competition Arena</Text>
                </Column>
              </Row>

              {/* Top competitors */}
              {kpi.arena.competitors.slice(0, 3).map((competitor: string, index: number) => (
                <Row key={index} className="mb-2">
                  <Column className="w-8">
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#805AD5',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        lineHeight: '24px',
                        display: 'inline-block',
                        marginRight: '8px',
                      }}
                    >
                      {index + 1}
                    </div>
                  </Column>
                  <Column>
                    <Text className="text-sm font-medium m-0">{competitor}</Text>
                  </Column>
                  <Column className="text-right">
                    <Text className="text-sm font-bold m-0" style={{ color: '#805AD5' }}>
                      {56 - index * 5}%
                    </Text>
                  </Column>
                </Row>
              ))}

              <Hr className="my-4 border-gray-200" />

              <Text className="text-sm text-gray-600 m-0">{kpi.arena.description}</Text>
            </Section>
          </Column>
        </Row>
      </Section>
    </Section>
  );
};

export default ExecutiveSummary;
