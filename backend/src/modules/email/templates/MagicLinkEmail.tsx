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

interface MagicLinkEmailProps {
  email: string;
  accessUrl: string;
}

export const MagicLinkEmail: React.FC<MagicLinkEmailProps> = ({ email, accessUrl }) => {
  return (
    <Html>
      <Head />
      <Preview>Sign in to Mint - Your magic link is ready</Preview>
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
            <Heading style={h1}>Welcome to Mint</Heading>
            <Text style={text}>
              Hello! You requested access to Mint for <strong>{email}</strong>.
            </Text>
            <Text style={text}>
              Click the button below to sign in and continue to your dashboard. This link will
              expire in 1 hour for security reasons.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href={accessUrl}>
                Sign In to Mint
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
            <Text style={securityText}>
              <strong>Security Notice:</strong> If you didn't request this link, you can safely
              ignore this email.
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

export default MagicLinkEmail;

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

const securityText = {
  color: colors.gray[600],
  fontSize: '14px',
  lineHeight: '20px',
  margin: '20px 0',
  padding: '12px',
  backgroundColor: colors.gray[50],
  borderRadius: '4px',
  border: `1px solid ${colors.gray[200]}`,
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