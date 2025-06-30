import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Img,
  Hr,
} from '@react-email/components';

interface InviteEmailProps {
  inviteEmail: string;
  inviterName: string;
  organizationName: string;
  inviteToken: string;
}

export default function InviteEmail({
  inviteEmail,
  inviterName,
  organizationName,
  inviteToken,
}: InviteEmailProps) {
  const baseUrl = process.env.FRONTEND_URL || 'https://app.getmint.ai';
  const logoUrl = `https://app.getmint.ai/logo-small.png`;
  const inviteUrl = `${baseUrl}/auth/login?token=${inviteToken}`;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Img
              src={logoUrl}
              width="120"
              height="40"
              alt="Mint AI"
              style={logo}
            />
          </Section>

          <Section style={content}>
            <Text style={heading}>
              You've been invited to Mint
            </Text>

            <Text style={paragraph}>
              Hi there,
            </Text>

            <Text style={paragraph}>
              <strong>{inviterName}</strong> has invited you to join their organization on Mint AI, the AI-powered brand intelligence platform.
            </Text>

            <Section style={buttonContainer}>
              <Button
                href={inviteUrl}
                style={button}
              >
                Accept Invitation
              </Button>
            </Section>

            <Text style={paragraph}>
              Or copy and paste this link in your browser:
            </Text>

            <Text style={linkText}>
              {inviteUrl}
            </Text>

            <Text style={paragraph}>
              This invitation will expire in 7 days. If you have any questions,
              feel free to reach out to {inviterName} or our support team.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Mint AI - AI-Powered Brand Intelligence
            </Text>
            <Text style={footerText}>
              © {new Date().getFullYear()} Mint AI. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f7f7f7',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const header = {
  padding: '24px 0',
  textAlign: 'center' as const,
};

const logo = {
  margin: '0 auto',
};

const content = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  marginBottom: '24px',
  textAlign: 'center' as const,
  color: '#333333',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '24px',
  marginBottom: '16px',
  color: '#555555',
};

const featureList = {
  paddingLeft: '0',
  listStyle: 'none',
  marginBottom: '24px',
};

const featureItem = {
  fontSize: '14px',
  lineHeight: '24px',
  marginBottom: '8px',
  color: '#666666',
  paddingLeft: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginTop: '32px',
  marginBottom: '32px',
};

const button = {
  backgroundColor: '#10b981',
  borderRadius: '6px',
  color: '#ffffff',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 32px',
  display: 'inline-block',
};

const linkText = {
  fontSize: '14px',
  color: '#10b981',
  backgroundColor: '#f9f9f9',
  padding: '12px',
  borderRadius: '6px',
  wordBreak: 'break-all' as const,
  marginBottom: '16px',
};

const footer = {
  padding: '32px 0 0 0',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '12px',
  lineHeight: '16px',
  color: '#999999',
  marginBottom: '4px',
};
