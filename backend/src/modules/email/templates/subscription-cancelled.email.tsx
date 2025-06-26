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

interface SubscriptionCancelledEmailProps {
  userName: string;
  userEmail: string;
  endDate: string;
  planName: string;
}

export const SubscriptionCancelledEmail: React.FC<SubscriptionCancelledEmailProps> = ({
  userName,
  userEmail,
  endDate,
  planName,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Your {planName} subscription has been cancelled</Preview>
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
            <Heading style={h1}>Subscription Cancellation Confirmed</Heading>
            <Text style={text}>
              Hi {userName || userEmail},
            </Text>
            <Text style={text}>
              We've successfully cancelled your <strong>{planName}</strong> subscription as requested.
              You'll continue to have access to all premium features until the end of your current billing period.
            </Text>
            <Text style={text}>
              After that, your account will automatically switch to the Free plan.
              Your data and projects will remain safe and accessible.
            </Text>
            <Section style={buttonContainer}>
              <Button style={button} href="https://app.getmint.ai/settings">
                Manage Account
              </Button>
            </Section>
            <Hr style={hr} />
            <Text style={subheading}>We're sorry to see you go</Text>
            <Text style={text}>
              If you have a moment, we'd love to hear about your experience and how we can improve.
              Feel free to reply to contact@getmint.ai with your feedback.
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              © {new Date().getFullYear()} Mint. All rights reserved.
            </Text>
            <Text style={footerText}>
              This email was sent to {userEmail} because you cancelled your subscription.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default SubscriptionCancelledEmail;

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

const subheading = {
  color: colors.gray[700],
  fontSize: '20px',
  fontWeight: '600',
  margin: '16px 0 12px',
};

const infoBox = {
  backgroundColor: colors.gray[50],
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
  border: `1px solid ${colors.gray[200]}`,
};

const infoText = {
  color: colors.gray[700],
  fontSize: '14px',
  lineHeight: '20px',
  margin: '8px 0',
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
