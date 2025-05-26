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
import { colors } from '../utils/colors';

interface ReportAccessEmailProps {
  reportDate: string;
  accessUrl: string;
  companyName: string;
}

export const ReportAccessEmail: React.FC<ReportAccessEmailProps> = ({
  reportDate,
  accessUrl,
  companyName,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Your MintReport for {companyName} is ready to view</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src="https://app.getmint.ai/logo-small.png"
              width="140"
              height="40"
              alt="Contexte AI"
              style={logo}
            />
          </Section>
          <Section style={content}>
            <Heading style={h1}>Your Brand Report is Ready</Heading>
            <Text style={text}>
              The weekly MINT Report for <strong>{companyName}</strong> ({reportDate}) is now
              available to view.
            </Text>
            <Text style={text}>
              Click the button below to access your report. This link will expire in 24 hours.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={accessUrl}>
                View Your Report
              </Button>
            </Section>
            <Text style={text}>
              If the button above doesn't work, you can also copy and paste this URL into your
              browser:
            </Text>
            <Text style={linkText}>
              <Link href={accessUrl} style={link}>
                {accessUrl}
              </Link>
            </Text>
            <Hr style={hr} />
            <Text style={footer}>© {new Date().getFullYear()} Mint. All rights reserved.</Text>
            <Text style={footerText}>
              This is an automated message, please do not reply directly to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ReportAccessEmail;

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
  borderRadius: '4px',
  maxWidth: '600px',
};

const logoContainer = {
  padding: '25px',
  borderBottom: `1px solid ${colors.gray[200]}`,
};

const logo = {
  margin: '0 auto',
};

const content = {
  padding: '25px',
};

const h1 = {
  color: colors.primary.DEFAULT,
  fontSize: '26px',
  fontWeight: '700',
  margin: '30px 0',
  padding: '0',
  lineHeight: '1.5',
};

const text = {
  color: colors.gray[800],
  fontSize: '16px',
  fontWeight: '400',
  lineHeight: '24px',
  margin: '16px 0',
};

const buttonContainer = {
  padding: '20px 0 30px',
};

const button = {
  backgroundColor: colors.primary.DEFAULT,
  borderRadius: '3px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px',
};

const linkText = {
  color: colors.gray[800],
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
  margin: '30px 0',
};

const footer = {
  color: colors.gray[500],
  fontSize: '14px',
  margin: '0',
};

const footerText = {
  color: colors.gray[500],
  fontSize: '12px',
  margin: '8px 0',
};
