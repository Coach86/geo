# Brand Intelligence Email Report

This module provides a ReactEmail-based template for generating brand intelligence reports as HTML emails. The design closely matches the Contexte AI Brand Intelligence Newsletter design.

## Structure

```
/email
  /components - Reusable email components
    /report-sections - Individual sections of the report
    Header.jsx - Email header with logo and branding
    Footer.jsx - Email footer with contact information
    Layout.jsx - Main email layout wrapper
  /templates
    BrandIntelligenceReport.jsx - Main report template
  /utils
    colors.js - Color definitions matching the original design
  /examples
    generateReport.js - Example utility for rendering the report
  index.js - Main exports
```

## Usage

To generate a brand intelligence report email:

```javascript
import { generateReportHtml } from '/src/modules/report/email';
import fs from 'fs';

// Generate HTML with sample data
const html = generateReportHtml();

// Save to file (for testing)
fs.writeFileSync('report.html', html);

// Or send via email using nodemailer or similar
const transporter = nodemailer.createTransport({...});

await transporter.sendMail({
  from: 'reports@contexte.ai',
  to: 'client@example.com',
  subject: 'Your Brand Intelligence Report',
  html: html
});
```

## Customization

The report template accepts a `data` object with the following structure:

```javascript
const reportData = {
  brand: "YourBrand",              // Brand name
  metadata: {                      // Report metadata
    url: "yourbrand.com",          // Brand URL
    market: "US Market / English", // Market/language
    flag: "🇺🇸",                   // Country flag emoji
    competitors: "Comp A, B, C",   // Comma-separated list
    date: "2025-05-13",            // Report date
    models: "ChatGPT, Claude...",  // Models tested
  },
  kpi: {                           // Executive summary KPIs
    pulse: { value: "68%", description: "..." },
    tone: { value: "+0.35", status: "green", description: "..." },
    accord: { value: "7.4/10", status: "green", description: "..." },
    arena: { competitors: ["A", "B", "C"], description: "..." },
  },
  // Individual sections data
  pulse: { ... },
  tone: { ... },
  accord: { ... },
  arena: { ... },
};
```

## Dependencies

This module requires:

- @react-email/components
- @react-email/render
- React

## Email Client Compatibility

The email template is designed to be compatible with major email clients:

- Gmail
- Apple Mail
- Outlook
- Yahoo Mail
- Mobile email clients

The layout uses responsive design principles and email-safe CSS to ensure consistent rendering across email clients.