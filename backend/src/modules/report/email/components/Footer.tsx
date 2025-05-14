import React from 'react';
import { 
  Section,
  Row,
  Column,
  Heading,
  Text,
  Hr,
  Link
} from '@react-email/components';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Section>
      <Hr className="border-gray-200 my-6" />
      
      <Row>
        <Column className="w-2/3 pr-4">
          <Heading as="h3" className="text-lg font-semibold text-gray-800 mb-4 m-0">Next Steps</Heading>
          <Text className="text-gray-600 m-0 mb-6">
            Schedule a consultation with our team to discuss these insights and develop a strategy to optimize your
            brand's presence in AI responses. Our experts will help you implement the recommendations and track your
            progress over time.
          </Text>
        </Column>
        <Column className="w-1/3 pl-4">
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #f3f4f6'
          }}>
            <Heading as="h4" className="text-base font-semibold text-gray-800 mb-3 m-0">Contact Us</Heading>
            <Text className="text-gray-600 mb-4 m-0">Have questions about this report?</Text>
            
            <div style={{ marginBottom: '8px' }}>
              <Row>
                <Column className="w-auto pr-2">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#1976d2' }}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </Column>
                <Column>
                  <Link href="mailto:support@contexte.ai" className="text-sm text-gray-700 no-underline hover:underline">
                    support@contexte.ai
                  </Link>
                </Column>
              </Row>
            </div>
            
            <div>
              <Row>
                <Column className="w-auto pr-2">
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#1976d2' }}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                </Column>
                <Column>
                  <Link href="tel:+15551234567" className="text-sm text-gray-700 no-underline hover:underline">
                    +1 (555) 123-4567
                  </Link>
                </Column>
              </Row>
            </div>
          </div>
        </Column>
      </Row>

      <Hr className="border-gray-200 my-6" />

      <Row>
        <Column className="w-1/2">
          <Text className="text-sm text-gray-500 m-0">
            © {currentYear} Contexte.ai — All Rights Reserved
          </Text>
        </Column>
        <Column className="w-1/2 text-right">
          <Row>
            <Column className="pr-4">
              <Link href="#" className="text-sm text-gray-500 no-underline hover:underline">
                Privacy Policy
              </Link>
            </Column>
            <Column className="px-4">
              <Link href="#" className="text-sm text-gray-500 no-underline hover:underline">
                Terms of Service
              </Link>
            </Column>
            <Column className="pl-4">
              <Link href="#" className="text-sm text-gray-500 no-underline hover:underline">
                Contact Us
              </Link>
            </Column>
          </Row>
        </Column>
      </Row>

      <Row className="mt-6">
        <Column className="text-center">
          <Text className="text-xs text-gray-400 m-0">
            This report was generated using AI data collected from May 1-15, 2025.
            Insights are based on AI responses at the time of testing and may change as models are updated.
          </Text>
        </Column>
      </Row>
    </Section>
  );
};

export default Footer;