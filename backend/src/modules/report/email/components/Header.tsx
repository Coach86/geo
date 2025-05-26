import React from 'react';
import { Section, Row, Column, Heading, Text } from '@react-email/components';

export const Header: React.FC = () => {
  return (
    <Section
      style={{
        background: 'linear-gradient(90deg, #1976d2 0%, #0d47a1 100%)',
        color: 'white',
        padding: '32px 16px',
      }}
    >
      <Row>
        {/* Left: Logo and Text */}
        <Column style={{ width: '75%' }}>
          <table width="100%">
            <tbody>
              <tr>
                <td style={{ verticalAlign: 'middle', paddingRight: 12 }}>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.20)',
                      backdropFilter: 'blur(2px)',
                      padding: '8px',
                      borderRadius: '8px',
                      display: 'inline-block',
                    }}
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ color: 'white' }}
                    >
                      <path
                        d="M12 2L2 7L12 12L22 7L12 2Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 17L12 22L22 17"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M2 12L12 17L22 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Heading
                    style={{ color: 'white', fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}
                  >
                    MINT
                  </Heading>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '1rem' }}>
                    Brand Intelligence in the LLM Era
                  </Text>
                </td>
              </tr>
            </tbody>
          </table>
        </Column>
        {/* Right: Date */}
        <Column style={{ width: '25%' }}>
          <div style={{ width: '100%', textAlign: 'right' }}>
            <Text
              style={{
                color: 'rgba(255,255,255,0.8)',
                margin: 0,
                fontSize: '0.95rem',
                textAlign: 'right',
              }}
            >
              {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </div>
        </Column>
      </Row>
    </Section>
  );
};

export default Header;
