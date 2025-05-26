import React from 'react';
import { Section, Row, Column, Heading, Text } from '@react-email/components';
import { ReportHeaderProps } from '../../utils/types';

export const ReportHeader: React.FC<ReportHeaderProps> = ({ brand, metadata }) => {
  return (
    <Section style={{ padding: 0 }}>
      {/* Title and Market/Language Row */}
      <Heading as="h1" style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        <span style={{ color: '#1976d2' }}>{brand}</span> Mint Report
      </Heading>
      <Row style={{ marginBottom: 24, alignItems: 'center' }}>
        <Column style={{ display: 'flex', alignItems: 'center', width: 'auto' }}>
          <Text
            style={{ color: '#334155', fontWeight: 500, fontSize: 15, margin: 0, marginRight: 16 }}
          >
            {metadata.flag} {metadata.market.split('/')[0].trim()}
          </Text>
          |
          <Text
            style={{
              color: '#334155',
              fontWeight: 500,
              fontSize: 15,
              margin: 0,
              marginRight: 16,
              marginLeft: 16,
            }}
          >
            🌐 {metadata.market.includes('/') ? metadata.market.split('/')[1].trim() : 'English'}
          </Text>
        </Column>
      </Row>
      {/* 2x2 Metadata Grid */}
      <Section style={{ padding: 0 }}>
        <Row>
          {/* Brand URL */}
          <Column style={{ width: '50%', paddingBottom: 24, verticalAlign: 'top' }}>
            <Text
              style={{
                color: '#64748b',
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                marginBottom: 4,
              }}
            >
              🌐 Brand URL
            </Text>
            <Text
              style={{
                color: '#1976d2',
                fontWeight: 700,
                fontSize: 16,
                margin: 0,
                textDecoration: 'underline',
              }}
            >
              {metadata.url}
            </Text>
          </Column>
          {/* Competitors */}
          <Column style={{ width: '50%', paddingBottom: 24, verticalAlign: 'top' }}>
            <Text
              style={{
                color: '#64748b',
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                marginBottom: 4,
              }}
            >
              🏢 Competitors
            </Text>
            <Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, margin: 0 }}>
              {metadata.competitors}
            </Text>
          </Column>
        </Row>
        <Row>
          {/* Date Run */}
          <Column style={{ width: '50%', verticalAlign: 'top' }}>
            <Text
              style={{
                color: '#64748b',
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                marginBottom: 4,
              }}
            >
              📅 Date Run
            </Text>
            <Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, margin: 0 }}>
              {metadata.date}
            </Text>
          </Column>
          {/* Models Tested */}
          <Column style={{ width: '50%', verticalAlign: 'top' }}>
            <Text
              style={{
                color: '#64748b',
                fontWeight: 600,
                fontSize: 15,
                margin: 0,
                marginBottom: 4,
              }}
            >
              💻 Models Tested
            </Text>
            <Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 16, margin: 0 }}>
              {metadata.models}
            </Text>
          </Column>
        </Row>
      </Section>
    </Section>
  );
};

export default ReportHeader;
