import React from 'react';
import { BrandIntelligenceReport } from '../../modules/report/email/templates/BrandIntelligenceReport';

// You can import mock data or use the default fallback in the template
const mockData = undefined; // or provide a real data object

export default function EmailPreview() {
  return (
    <div style={{ background: '#f4f4f4', minHeight: '100vh', padding: 32 }}>
      <h1 style={{ fontSize: 24, marginBottom: 24 }}>Email Template Preview</h1>
      <div
        style={{
          maxWidth: 800,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 2px 8px #0001',
          padding: 24,
        }}
      >
        <BrandIntelligenceReport data={mockData} />
      </div>
    </div>
  );
}
