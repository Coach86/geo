import React, { ReactNode } from 'react';
import { 
  Html,
  Head,
  Body,
  Container,
  Tailwind
} from '@react-email/components';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Html>
      <Tailwind>
        <Head>
          <title>Brand Intelligence Report</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </Head>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto max-w-[700px] p-4">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default Layout;