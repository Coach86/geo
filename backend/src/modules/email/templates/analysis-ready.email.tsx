import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Hr,
  Img,
} from '@react-email/components';
import * as React from 'react';
import { colors } from '../../report/email/utils/colors';

interface AnalysisReadyEmailProps {
  brandName: string;
  reportUrl: string;
  analysisDate: string;
}

export const AnalysisReadyEmail: React.FC<AnalysisReadyEmailProps> = ({
  brandName,
  reportUrl,
  analysisDate,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Your {brandName} brand analysis is ready to view</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src="https://app.getmint.ai/logo-small.png"
              width="140"
              height="46"
              alt="Mint"
              style={logo}
            />
          </Section>
          <Section style={content}>
            <Heading style={h1}>Your Brand Analysis is Ready</Heading>
            <Text style={text}>
              Great news! The brand analysis for <strong>{brandName}</strong> has been completed.
            </Text>
            <Text style={text}>
              Your comprehensive report includes insights on brand visibility, sentiment analysis, 
              alignment with key attributes, and competitive positioning across multiple AI models.
            </Text>
            <Text style={subtext}>
              Analysis completed on {analysisDate}
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={reportUrl}>
                View Your Report
              </Button>
            </Section>
            <Text style={text}>
              If the button above doesn't work, you can also copy and paste this URL into your
              browser:
            </Text>
            <Text style={linkText}>
              <Link href={reportUrl} style={link}>
                {reportUrl}
              </Link>
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              © {new Date().getFullYear()} Mint. All rights reserved.
            </Text>
            <Text style={footerText}>
              This is an automated notification. Please do not reply directly to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default AnalysisReadyEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0',
  borderRadius: '8px',
  maxWidth: '600px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const logoContainer = {
  padding: '30px 25px 20px',
  borderBottom: `1px solid ${colors.gray[200]}`,
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '30px 25px',
};

const h1 = {
  color: colors.primary.DEFAULT,
  fontSize: '28px',
  fontWeight: '700',
  margin: '0 0 20px',
  padding: '0',
  lineHeight: '1.3',
};

const text = {
  color: colors.gray[800],
  fontSize: '16px',
  fontWeight: '400',
  lineHeight: '26px',
  margin: '16px 0',
};

const subtext = {
  color: colors.gray[600],
  fontSize: '14px',
  fontWeight: '400',
  lineHeight: '20px',
  margin: '12px 0 24px',
};

const buttonContainer = {
  padding: '24px 0 32px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: colors.primary.DEFAULT,
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
};

const linkText = {
  color: colors.gray[600],
  fontSize: '14px',
  lineHeight: '24px',
  margin: '16px 0',
  wordBreak: 'break-all' as const,
};

const link = {
  color: colors.primary.DEFAULT,
  textDecoration: 'underline',
};

const hr = {
  borderColor: colors.gray[200],
  margin: '32px 0 24px',
};

const footer = {
  color: colors.gray[500],
  fontSize: '14px',
  margin: '0',
  textAlign: 'center' as const,
};

const footerText = {
  color: colors.gray[500],
  fontSize: '12px',
  margin: '8px 0 0',
  textAlign: 'center' as const,
};