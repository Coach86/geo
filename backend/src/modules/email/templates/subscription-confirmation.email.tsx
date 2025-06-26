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

interface SubscriptionConfirmationEmailProps {
  userName: string;
  userEmail: string;
  planName: string;
  amount: number;
  billingCycle?: string;
}

export default function SubscriptionConfirmationEmail({
  userName,
  userEmail,
  planName,
  amount,
  billingCycle = 'monthly',
}: SubscriptionConfirmationEmailProps) {
  const baseUrl = process.env.FRONTEND_URL || 'https://app.getmint.ai';
  const logoUrl = `https://app.getmint.ai/mint-logo.png`;
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100); // Convert cents to dollars

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
              Welcome to {planName}!
            </Text>

            <Text style={paragraph}>
              Hi {userName},
            </Text>

            <Text style={paragraph}>
              Thank you for subscribing to Mint AI. Your subscription has been successfully activated!
            </Text>

            <Section style={subscriptionDetails}>
              <Text style={detailsHeading}>Subscription Details</Text>
              <Hr style={divider} />

              <Text style={detailRow}>
                <strong>Plan:</strong> {planName}
              </Text>

            </Section>

            <Text style={paragraph}>
              You now have access to all the premium features included in your plan.
              Start exploring and make the most of your brand intelligence insights!
            </Text>

            <Section style={buttonContainer}>
              <Button
                href={baseUrl}
                style={button}
              >
                Go to Dashboard
              </Button>
            </Section>
          </Section>

          <Section style={footer}>
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

const subscriptionDetails = {
  backgroundColor: '#f9f9f9',
  borderRadius: '6px',
  padding: '20px',
  marginTop: '24px',
  marginBottom: '24px',
};

const detailsHeading = {
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '12px',
  color: '#333333',
};

const divider = {
  borderTop: '1px solid #e0e0e0',
  marginBottom: '16px',
};

const detailRow = {
  fontSize: '14px',
  lineHeight: '20px',
  marginBottom: '8px',
  color: '#666666',
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

const link = {
  color: '#10b981',
  textDecoration: 'underline',
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
