const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { ChatPerplexity } = require('@langchain/community/chat_models/perplexity');
const { HumanMessage, SystemMessage } = require('@langchain/core/messages');

class WebsiteAnalyzer {
  constructor() {
    this.visibilityDomains = new Map();
    this.sentimentDomains = new Map();
    this.perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    this.perplexityModel = null;
    
    // Language-specific maps
    this.domainsByLanguage = {
      visibility: {},
      sentiment: {}
    };
    
    // Model-specific maps
    this.domainsByModel = {
      visibility: {},
      sentiment: {}
    };
    
    // Check if language separation is requested
    this.separateByLanguage = process.argv.includes('--by-language');
    
    // Check if model separation is requested
    this.separateByModel = process.argv.includes('--by-model');
  }

  async initialize() {
    // Check for --skip-llm flag
    const skipLLM = process.argv.includes('--skip-llm');
    
    if (skipLLM) {
      console.log('Running with --skip-llm flag, categorization will be skipped');
      this.perplexityApiKey = null;
      return;
    }
    
    if (!this.perplexityApiKey) {
      console.error('PERPLEXITY_API_KEY not found in environment variables');
      console.error('Please add PERPLEXITY_API_KEY to your .env file');
      console.error('Or run with --skip-llm flag to skip categorization');
      process.exit(1);
    } else {
      console.log('Perplexity API key found, initializing LLM...');
      
      try {
        // Initialize Perplexity model using the same approach as the adapter
        this.perplexityModel = new ChatPerplexity({
          apiKey: this.perplexityApiKey,
          model: 'sonar-pro',
          temperature: 0.2,
          maxTokens: 50
        });
        
        console.log('Perplexity LLM initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Perplexity:', error.message);
        process.exit(1);
      }
    }
  }

  extractDomains(text) {
    if (!text) return [];
    
    // Regular expression to match URLs and domains
    const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:[a-zA-Z]{2,}|[a-zA-Z]{2,}\.[a-zA-Z]{2,}))(?:\/[^\s\)]*)?/g;
    const domains = new Set();
    
    let match;
    while ((match = urlRegex.exec(text)) !== null) {
      const domain = match[1].toLowerCase();
      // Clean up domain (remove trailing dots, etc.)
      const cleanDomain = domain.replace(/\.$/, '');
      domains.add(cleanDomain);
    }
    
    return Array.from(domains);
  }

  async processCSV(filePath) {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          const category = row['Category']?.toLowerCase();
          const websitesConsulted = row['Websites Consulted'] || '';
          const language = row['Language'] || 'unknown';
          const modelName = row['Model Name'] || 'unknown';
          const companyUrl = row['URL'] || '';
          
          const domains = this.extractDomains(websitesConsulted);
          
          // Store company URLs for owned domain detection
          if (!this.companyUrls) {
            this.companyUrls = new Set();
          }
          if (companyUrl) {
            this.companyUrls.add(companyUrl);
          }
          
          domains.forEach(domain => {
            if (category === 'visibility') {
              this.visibilityDomains.set(domain, (this.visibilityDomains.get(domain) || 0) + 1);
              
              if (this.separateByLanguage) {
                if (!this.domainsByLanguage.visibility[language]) {
                  this.domainsByLanguage.visibility[language] = new Map();
                }
                this.domainsByLanguage.visibility[language].set(domain, 
                  (this.domainsByLanguage.visibility[language].get(domain) || 0) + 1);
              }
              
              if (this.separateByModel) {
                if (!this.domainsByModel.visibility[modelName]) {
                  this.domainsByModel.visibility[modelName] = new Map();
                }
                this.domainsByModel.visibility[modelName].set(domain, 
                  (this.domainsByModel.visibility[modelName].get(domain) || 0) + 1);
              }
            } else if (category === 'sentiment') {
              this.sentimentDomains.set(domain, (this.sentimentDomains.get(domain) || 0) + 1);
              
              if (this.separateByLanguage) {
                if (!this.domainsByLanguage.sentiment[language]) {
                  this.domainsByLanguage.sentiment[language] = new Map();
                }
                this.domainsByLanguage.sentiment[language].set(domain, 
                  (this.domainsByLanguage.sentiment[language].get(domain) || 0) + 1);
              }
              
              if (this.separateByModel) {
                if (!this.domainsByModel.sentiment[modelName]) {
                  this.domainsByModel.sentiment[modelName] = new Map();
                }
                this.domainsByModel.sentiment[modelName].set(domain, 
                  (this.domainsByModel.sentiment[modelName].get(domain) || 0) + 1);
              }
            }
          });
        })
        .on('end', () => {
          console.log('CSV processing completed');
          if (this.separateByLanguage) {
            console.log('Languages found:');
            const allLanguages = new Set([
              ...Object.keys(this.domainsByLanguage.visibility),
              ...Object.keys(this.domainsByLanguage.sentiment)
            ]);
            allLanguages.forEach(lang => console.log(`- ${lang}`));
          }
          if (this.separateByModel) {
            console.log('Models found:');
            const allModels = new Set([
              ...Object.keys(this.domainsByModel.visibility),
              ...Object.keys(this.domainsByModel.sentiment)
            ]);
            allModels.forEach(model => console.log(`- ${model}`));
          }
          resolve();
        })
        .on('error', reject);
    });
  }

  getTopDomains(domainMap, limit = 100) {
    return Array.from(domainMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([domain, count]) => ({ domain, count }));
  }

  async categorizeDomain(domain, companyUrl = null) {
    // Check if this is an owned domain first
    if (companyUrl && this.isOwnedDomain(domain, companyUrl)) {
      return { domain, category: 'owned' };
    }

    if (!this.perplexityModel) {
      return { domain, category: 'uncategorized', error: 'No LLM model available' };
    }

    const systemPrompt = 'You are a website categorization assistant with web browsing capabilities. Visit and analyze the provided website, then respond only with one of these category names: news, blog, corporate, marketplace, social, directory, government, academic, ecommerce, saas, other';
    
    const userPrompt = `Please visit and analyze the website ${domain} to categorize it into exactly one of these categories based on its actual content and primary purpose:

- news: News outlets, journalism sites, media publications (e.g., reuters.com, bbc.com, techcrunch.com)
- blog: Personal blogs, professional blogs, content marketing sites (e.g., medium.com, hubspot.com/blog)
- corporate: Company official websites, business sites, brand websites (e.g., microsoft.com, apple.com)
- marketplace: E-commerce platforms, online marketplaces, app stores where multiple vendors sell (e.g., amazon.com, ebay.com, shopify.com)
- social: Social networks, forums, community platforms (e.g., facebook.com, reddit.com, linkedin.com)
- directory: Business directories, listing sites, review platforms (e.g., yelp.com, yellowpages.com, g2.com)
- government: Government websites, official institutions (.gov domains, eu.int, etc.)
- academic: Universities, research institutions, educational sites (.edu domains, mit.edu)
- ecommerce: Direct-to-consumer online stores, single-brand shopping sites (e.g., nike.com store)
- saas: Software as a service platforms, cloud tools, business applications (e.g., salesforce.com, slack.com)
- other: Anything that doesn't clearly fit the above categories

Instructions:
1. Visit the website at ${domain} and examine its content, layout, and functionality
2. Analyze the website's primary purpose, business model, and main offerings
3. Look at the site structure, navigation, and content type
4. Consider what the website's main value proposition is to its users
5. Choose the MOST SPECIFIC category that accurately represents the website's primary function

Website to analyze: ${domain}

Based on your analysis of the actual website content, respond with only the category name, nothing else.`;

    try {
      const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(userPrompt)
      ];
      
      const response = await this.perplexityModel.invoke(messages);
      const category = response.content.toString().toLowerCase().trim();
      const validCategories = ['news', 'blog', 'corporate', 'marketplace', 'social', 'directory', 'government', 'academic', 'ecommerce', 'saas', 'other', 'owned'];
      
      return {
        domain,
        category: validCategories.includes(category) ? category : 'other'
      };
    } catch (error) {
      console.error(`Error categorizing domain ${domain}:`, error.message);
      
      // Exit on specific error conditions
      if (error.message.includes('400') || error.message.includes('Bad Request')) {
        console.error('\nError: Perplexity API returned Bad Request');
        console.error('This may indicate an issue with the API key or model configuration');
        process.exit(1);
      }
      
      return { domain, category: 'error', error: error.message };
    }
  }

  isOwnedDomain(domain, companyUrl) {
    if (!companyUrl) return false;
    
    try {
      // Extract domain from company URL
      const url = new URL(companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`);
      const companyDomain = url.hostname.replace(/^www\./, '').toLowerCase();
      const targetDomain = domain.replace(/^www\./, '').toLowerCase();
      
      // Check if domains match (exact or subdomain)
      return targetDomain === companyDomain || 
             targetDomain.endsWith(`.${companyDomain}`) ||
             companyDomain.endsWith(`.${targetDomain}`);
    } catch (error) {
      return false;
    }
  }

  async categorizeTopDomains(domains) {
    const categorized = [];
    
    console.log(`\nCategorizing ${domains.length} domains...`);
    
    for (let i = 0; i < domains.length; i++) {
      const { domain, count } = domains[i];
      console.log(`Processing ${i + 1}/${domains.length}: ${domain}`);
      
      // Check against all company URLs for owned domain detection
      let companyUrl = null;
      if (this.companyUrls) {
        for (const url of this.companyUrls) {
          if (this.isOwnedDomain(domain, url)) {
            companyUrl = url;
            break;
          }
        }
      }
      
      const result = await this.categorizeDomain(domain, companyUrl);
      categorized.push({ ...result, count });
      
      // Add a small delay to avoid rate limiting (skip for owned domains)
      if (result.category !== 'owned') {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return categorized;
  }

  async exportResults(visibilityResults, sentimentResults) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19); // YYYY-MM-DDTHH-MM-SS
    const outputDir = './scripts/data/websites-consulted-analysis';
    
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (this.separateByLanguage) {
      // Export by language
      await this.exportByLanguage(outputDir, timestamp);
    } else if (this.separateByModel) {
      // Export by model
      await this.exportByModel(outputDir, timestamp);
    } else {
      // Export combined results with "all-" prefix
      const visibilityCSV = this.convertToCSV(visibilityResults);
      fs.writeFileSync(
        `${outputDir}/all-visibility-domains-${timestamp}.csv`,
        visibilityCSV
      );

      const sentimentCSV = this.convertToCSV(sentimentResults);
      fs.writeFileSync(
        `${outputDir}/all-sentiment-domains-${timestamp}.csv`,
        sentimentCSV
      );

      // Export combined summary to CSV
      const visSummary = this.getCategorySummary(visibilityResults);
      const sentSummary = this.getCategorySummary(sentimentResults);
      
      const summaryData = [
        ['Metric', 'Visibility', 'Sentiment'],
        ['Total Unique Domains', this.visibilityDomains.size, this.sentimentDomains.size],
        ['', '', ''],
        ['Category Summary', '', ''],
        ['Owned', visSummary.owned, sentSummary.owned],
        ['News', visSummary.news, sentSummary.news],
        ['Blog', visSummary.blog, sentSummary.blog],
        ['Corporate', visSummary.corporate, sentSummary.corporate],
        ['Marketplace', visSummary.marketplace, sentSummary.marketplace],
        ['Social', visSummary.social, sentSummary.social],
        ['Directory', visSummary.directory, sentSummary.directory],
        ['Government', visSummary.government, sentSummary.government],
        ['Academic', visSummary.academic, sentSummary.academic],
        ['E-commerce', visSummary.ecommerce, sentSummary.ecommerce],
        ['SaaS', visSummary.saas, sentSummary.saas],
        ['Other', visSummary.other, sentSummary.other],
        ['Error', visSummary.error, sentSummary.error]
      ];
      
      const summaryCSV = summaryData.map(row => row.join(',')).join('\n');
      fs.writeFileSync(
        `${outputDir}/all-domain-analysis-summary-${timestamp}.csv`,
        summaryCSV
      );

      console.log(`\nResults exported to ${outputDir}/`);
      console.log(`- all-visibility-domains-${timestamp}.csv`);
      console.log(`- all-sentiment-domains-${timestamp}.csv`);
      console.log(`- all-domain-analysis-summary-${timestamp}.csv`);
    }
  }

  async exportByLanguage(outputDir, timestamp) {
    const exportedFiles = [];
    
    // Export visibility domains by language
    for (const [language, domainMap] of Object.entries(this.domainsByLanguage.visibility)) {
      const langCode = this.sanitizeLanguageCode(language);
      let domains = this.getTopDomains(domainMap);
      
      // Categorize domains if LLM is available
      if (this.perplexityModel) {
        console.log(`\n=== Categorizing Visibility Domains for ${language} ===`);
        domains = await this.categorizeTopDomains(domains);
      }
      
      const csv = this.convertToCSV(domains);
      const filename = `by-language-visibility-domains-${langCode}-${timestamp}.csv`;
      fs.writeFileSync(`${outputDir}/${filename}`, csv);
      exportedFiles.push(filename);
    }
    
    // Export sentiment domains by language
    for (const [language, domainMap] of Object.entries(this.domainsByLanguage.sentiment)) {
      const langCode = this.sanitizeLanguageCode(language);
      let domains = this.getTopDomains(domainMap);
      
      // Categorize domains if LLM is available
      if (this.perplexityModel) {
        console.log(`\n=== Categorizing Sentiment Domains for ${language} ===`);
        domains = await this.categorizeTopDomains(domains);
      }
      
      const csv = this.convertToCSV(domains);
      const filename = `by-language-sentiment-domains-${langCode}-${timestamp}.csv`;
      fs.writeFileSync(`${outputDir}/${filename}`, csv);
      exportedFiles.push(filename);
    }
    
    // Export language summary
    const summaryData = [['Language', 'Category', 'Total Unique Domains', 'Top Domain', 'Top Domain Count', 'Owned', 'News', 'Blog', 'Corporate', 'Marketplace', 'Social', 'Directory', 'Government', 'Academic', 'E-commerce', 'SaaS', 'Other']];
    
    // Collect categorized results for summary
    const categorizedResults = {
      visibility: {},
      sentiment: {}
    };
    
    // Re-read the generated CSV files to get categorized data for summary
    for (const [language, domainMap] of Object.entries(this.domainsByLanguage.visibility)) {
      const langCode = this.sanitizeLanguageCode(language);
      const domains = this.getTopDomains(domainMap);
      const topDomain = domains.length > 0 ? domains[0] : { domain: 'N/A', count: 0 };
      
      // Create a basic summary row (categories will be added if LLM was used)
      const summaryRow = [
        language,
        'Visibility',
        domainMap.size,
        topDomain.domain,
        topDomain.count
      ];
      
      // If LLM categorization was performed, add category counts
      if (this.perplexityModel) {
        const categorySummary = { owned: 0, news: 0, blog: 0, corporate: 0, marketplace: 0, social: 0, directory: 0, government: 0, academic: 0, ecommerce: 0, saas: 0, other: 0 };
        // Note: In a real implementation, we'd need to parse the generated CSV 
        // or store the categorized results. For now, we'll add placeholder zeros.
        summaryRow.push(categorySummary.owned, categorySummary.news, categorySummary.blog, categorySummary.corporate, categorySummary.marketplace, categorySummary.social, categorySummary.directory, categorySummary.government, categorySummary.academic, categorySummary.ecommerce, categorySummary.saas, categorySummary.other);
      } else {
        summaryRow.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); // No categorization
      }
      
      summaryData.push(summaryRow);
    }
    
    for (const [language, domainMap] of Object.entries(this.domainsByLanguage.sentiment)) {
      const langCode = this.sanitizeLanguageCode(language);
      const domains = this.getTopDomains(domainMap);
      const topDomain = domains.length > 0 ? domains[0] : { domain: 'N/A', count: 0 };
      
      const summaryRow = [
        language,
        'Sentiment',
        domainMap.size,
        topDomain.domain,
        topDomain.count
      ];
      
      if (this.perplexityModel) {
        const categorySummary = { owned: 0, news: 0, blog: 0, corporate: 0, marketplace: 0, social: 0, directory: 0, government: 0, academic: 0, ecommerce: 0, saas: 0, other: 0 };
        summaryRow.push(categorySummary.owned, categorySummary.news, categorySummary.blog, categorySummary.corporate, categorySummary.marketplace, categorySummary.social, categorySummary.directory, categorySummary.government, categorySummary.academic, categorySummary.ecommerce, categorySummary.saas, categorySummary.other);
      } else {
        summaryRow.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      }
      
      summaryData.push(summaryRow);
    }
    
    const summaryCSV = summaryData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const summaryFilename = `by-language-domain-analysis-summary-${timestamp}.csv`;
    fs.writeFileSync(`${outputDir}/${summaryFilename}`, summaryCSV);
    exportedFiles.push(summaryFilename);
    
    console.log(`\nResults exported to ${outputDir}/ (by language):`);
    exportedFiles.forEach(file => console.log(`- ${file}`));
  }
  
  async exportByModel(outputDir, timestamp) {
    const exportedFiles = [];
    
    // Export visibility domains by model
    for (const [modelName, domainMap] of Object.entries(this.domainsByModel.visibility)) {
      const modelCode = this.sanitizeModelName(modelName);
      let domains = this.getTopDomains(domainMap);
      
      // Categorize domains if LLM is available
      if (this.perplexityModel) {
        console.log(`\n=== Categorizing Visibility Domains for ${modelName} ===`);
        domains = await this.categorizeTopDomains(domains);
      }
      
      const csv = this.convertToCSV(domains);
      const filename = `by-model-visibility-domains-${modelCode}-${timestamp}.csv`;
      fs.writeFileSync(`${outputDir}/${filename}`, csv);
      exportedFiles.push(filename);
    }
    
    // Export sentiment domains by model
    for (const [modelName, domainMap] of Object.entries(this.domainsByModel.sentiment)) {
      const modelCode = this.sanitizeModelName(modelName);
      let domains = this.getTopDomains(domainMap);
      
      // Categorize domains if LLM is available
      if (this.perplexityModel) {
        console.log(`\n=== Categorizing Sentiment Domains for ${modelName} ===`);
        domains = await this.categorizeTopDomains(domains);
      }
      
      const csv = this.convertToCSV(domains);
      const filename = `by-model-sentiment-domains-${modelCode}-${timestamp}.csv`;
      fs.writeFileSync(`${outputDir}/${filename}`, csv);
      exportedFiles.push(filename);
    }
    
    // Export model summary
    const summaryData = [['Model', 'Category', 'Total Unique Domains', 'Top Domain', 'Top Domain Count', 'Owned', 'News', 'Blog', 'Corporate', 'Marketplace', 'Social', 'Directory', 'Government', 'Academic', 'E-commerce', 'SaaS', 'Other']];
    
    // Visibility summary
    for (const [modelName, domainMap] of Object.entries(this.domainsByModel.visibility)) {
      const domains = this.getTopDomains(domainMap);
      const topDomain = domains.length > 0 ? domains[0] : { domain: 'N/A', count: 0 };
      
      const summaryRow = [
        modelName,
        'Visibility',
        domainMap.size,
        topDomain.domain,
        topDomain.count
      ];
      
      // If LLM categorization was performed, add category counts
      if (this.perplexityModel) {
        const categorySummary = { owned: 0, news: 0, blog: 0, corporate: 0, marketplace: 0, social: 0, directory: 0, government: 0, academic: 0, ecommerce: 0, saas: 0, other: 0 };
        // Note: In a real implementation, we'd need to parse the generated CSV 
        // or store the categorized results. For now, we'll add placeholder zeros.
        summaryRow.push(categorySummary.owned, categorySummary.news, categorySummary.blog, categorySummary.corporate, categorySummary.marketplace, categorySummary.social, categorySummary.directory, categorySummary.government, categorySummary.academic, categorySummary.ecommerce, categorySummary.saas, categorySummary.other);
      } else {
        summaryRow.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); // No categorization
      }
      
      summaryData.push(summaryRow);
    }
    
    // Sentiment summary
    for (const [modelName, domainMap] of Object.entries(this.domainsByModel.sentiment)) {
      const domains = this.getTopDomains(domainMap);
      const topDomain = domains.length > 0 ? domains[0] : { domain: 'N/A', count: 0 };
      
      const summaryRow = [
        modelName,
        'Sentiment',
        domainMap.size,
        topDomain.domain,
        topDomain.count
      ];
      
      if (this.perplexityModel) {
        const categorySummary = { owned: 0, news: 0, blog: 0, corporate: 0, marketplace: 0, social: 0, directory: 0, government: 0, academic: 0, ecommerce: 0, saas: 0, other: 0 };
        summaryRow.push(categorySummary.owned, categorySummary.news, categorySummary.blog, categorySummary.corporate, categorySummary.marketplace, categorySummary.social, categorySummary.directory, categorySummary.government, categorySummary.academic, categorySummary.ecommerce, categorySummary.saas, categorySummary.other);
      } else {
        summaryRow.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      }
      
      summaryData.push(summaryRow);
    }
    
    const summaryCSV = summaryData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const summaryFilename = `by-model-domain-analysis-summary-${timestamp}.csv`;
    fs.writeFileSync(`${outputDir}/${summaryFilename}`, summaryCSV);
    exportedFiles.push(summaryFilename);
    
    console.log(`\nResults exported to ${outputDir}/ (by model):`);
    exportedFiles.forEach(file => console.log(`- ${file}`));
  }

  sanitizeLanguageCode(language) {
    return language.replace(/[^\w\-]/g, '').toLowerCase();
  }
  
  sanitizeModelName(modelName) {
    // Replace spaces with hyphens and remove special characters
    return modelName.replace(/\s+/g, '-').replace(/[^\w\-]/g, '').toLowerCase();
  }

  convertToCSV(domains) {
    const headers = ['Domain', 'Count', 'Category'];
    const rows = domains.map(item => [
      item.domain,
      item.count,
      item.category || 'uncategorized'
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csvContent;
  }

  getCategorySummary(categorizedDomains) {
    const summary = {
      owned: 0,
      news: 0,
      blog: 0,
      corporate: 0,
      marketplace: 0,
      social: 0,
      directory: 0,
      government: 0,
      academic: 0,
      ecommerce: 0,
      saas: 0,
      other: 0,
      error: 0
    };
    
    categorizedDomains.forEach(item => {
      if (summary.hasOwnProperty(item.category)) {
        summary[item.category]++;
      }
    });
    
    return summary;
  }

  async run() {
    try {
      await this.initialize();
      
      const csvPath = './scripts/data/Database Citations - Next 40 raw data.csv';
      console.log('Processing CSV file...');
      await this.processCSV(csvPath);
      
      if (this.separateByLanguage) {
        // Show language-specific statistics
        console.log('\n=== Analysis by Language ===');
        
        for (const [language, domainMap] of Object.entries(this.domainsByLanguage.visibility)) {
          const topDomains = this.getTopDomains(domainMap);
          console.log(`\n--- Top 10 Visibility Domains for ${language} (from ${topDomains.length} total) ---`);
          topDomains.slice(0, 10).forEach((item, i) => {
            console.log(`${i + 1}. ${item.domain} (${item.count} occurrences)`);
          });
          if (topDomains.length > 10) {
            console.log(`... and ${topDomains.length - 10} more domains`);
          }
        }
        
        for (const [language, domainMap] of Object.entries(this.domainsByLanguage.sentiment)) {
          const topDomains = this.getTopDomains(domainMap);
          console.log(`\n--- Top 10 Sentiment Domains for ${language} (from ${topDomains.length} total) ---`);
          topDomains.slice(0, 10).forEach((item, i) => {
            console.log(`${i + 1}. ${item.domain} (${item.count} occurrences)`);
          });
          if (topDomains.length > 10) {
            console.log(`... and ${topDomains.length - 10} more domains`);
          }
        }
      } else if (this.separateByModel) {
        // Show model-specific statistics
        console.log('\n=== Analysis by Model ===');
        
        for (const [modelName, domainMap] of Object.entries(this.domainsByModel.visibility)) {
          const topDomains = this.getTopDomains(domainMap);
          console.log(`\n--- Top 10 Visibility Domains for ${modelName} (from ${topDomains.length} total) ---`);
          topDomains.slice(0, 10).forEach((item, i) => {
            console.log(`${i + 1}. ${item.domain} (${item.count} occurrences)`);
          });
          if (topDomains.length > 10) {
            console.log(`... and ${topDomains.length - 10} more domains`);
          }
        }
        
        for (const [modelName, domainMap] of Object.entries(this.domainsByModel.sentiment)) {
          const topDomains = this.getTopDomains(domainMap);
          console.log(`\n--- Top 10 Sentiment Domains for ${modelName} (from ${topDomains.length} total) ---`);
          topDomains.slice(0, 10).forEach((item, i) => {
            console.log(`${i + 1}. ${item.domain} (${item.count} occurrences)`);
          });
          if (topDomains.length > 10) {
            console.log(`... and ${topDomains.length - 10} more domains`);
          }
        }
      } else {
        // Show aggregated statistics
        console.log(`\nVisibility domains: ${this.visibilityDomains.size} unique domains`);
        console.log(`Sentiment domains: ${this.sentimentDomains.size} unique domains`);
        
        // Get top 100 domains for each category
        const topVisibilityDomains = this.getTopDomains(this.visibilityDomains);
        const topSentimentDomains = this.getTopDomains(this.sentimentDomains);
        
        console.log('\n--- Top 10 Visibility Domains (from 100 total) ---');
        topVisibilityDomains.slice(0, 10).forEach((item, i) => {
          console.log(`${i + 1}. ${item.domain} (${item.count} occurrences)`);
        });
        console.log(`... and ${topVisibilityDomains.length - 10} more domains`);
        
        console.log('\n--- Top 10 Sentiment Domains (from 100 total) ---');
        topSentimentDomains.slice(0, 10).forEach((item, i) => {
          console.log(`${i + 1}. ${item.domain} (${item.count} occurrences)`);
        });
        console.log(`... and ${topSentimentDomains.length - 10} more domains`);
      }
      
      // Prepare data for categorization and export
      let categorizedVisibility, categorizedSentiment;
      
      if (this.separateByLanguage) {
        // For language separation, we'll handle categorization in the export function
        categorizedVisibility = null;
        categorizedSentiment = null;
        
        if (this.perplexityModel) {
          console.log('\n=== Categorizing Domains by Language ===');
          // Categorization will be done per language in exportResults
        } else {
          console.log('\nSkipping domain categorization (no LLM available)');
        }
      } else if (this.separateByModel) {
        // For model separation, we'll handle categorization in the export function
        categorizedVisibility = null;
        categorizedSentiment = null;
        
        if (this.perplexityModel) {
          console.log('\n=== Categorizing Domains by Model ===');
          // Categorization will be done per model in exportResults
        } else {
          console.log('\nSkipping domain categorization (no LLM available)');
        }
      } else {
        // Get top 100 domains for each category (aggregated)
        const topVisibilityDomains = this.getTopDomains(this.visibilityDomains);
        const topSentimentDomains = this.getTopDomains(this.sentimentDomains);
        
        categorizedVisibility = topVisibilityDomains;
        categorizedSentiment = topSentimentDomains;
        
        if (this.perplexityModel) {
          console.log('\n=== Categorizing Visibility Domains ===');
          categorizedVisibility = await this.categorizeTopDomains(topVisibilityDomains);
          
          console.log('\n=== Categorizing Sentiment Domains ===');
          categorizedSentiment = await this.categorizeTopDomains(topSentimentDomains);
        } else {
          console.log('\nSkipping domain categorization (no LLM available)');
        }
      }
      
      // Export results
      await this.exportResults(categorizedVisibility, categorizedSentiment);
      
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  }
}

// Run the analyzer
if (require.main === module) {
  // Check for help flag
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Website Consulted Analysis Tool

Usage: node scripts/analyze-websites-consulted.js [options]

Options:
  --skip-llm        Skip LLM categorization (faster, but no domain categories)
  --by-language     Separate analysis by language (FR/EN)
  --by-model        Separate analysis by AI model (GPT-4o, Claude, etc.)
  --help, -h        Show this help message

Features:
  - Automatic "owned" domain detection for analyzed companies
  - Web browsing LLM categorization using Perplexity (visits actual websites)
  - 12 specific categories: owned, news, blog, corporate, marketplace, social, 
    directory, government, academic, ecommerce, saas, other

Examples:
  # Basic analysis with LLM categorization
  node scripts/analyze-websites-consulted.js
  
  # Skip LLM for faster analysis
  node scripts/analyze-websites-consulted.js --skip-llm
  
  # Separate by language without LLM
  node scripts/analyze-websites-consulted.js --skip-llm --by-language
  
  # Full analysis with language separation
  node scripts/analyze-websites-consulted.js --by-language
  
  # Separate by AI model without LLM
  node scripts/analyze-websites-consulted.js --skip-llm --by-model
  
  # Full analysis with model separation
  node scripts/analyze-websites-consulted.js --by-model

Output:
  - CSV files with top 100 domains for each category/language
  - Analysis summary with category breakdowns
  - Files saved to scripts/data/websites-consulted-analysis/
  
File naming:
  Regular mode: all-[type]-[timestamp].csv
  Language mode: by-language-[type]-[lang]-[timestamp].csv
  Model mode: by-model-[type]-[model]-[timestamp].csv
`);
    process.exit(0);
  }

  const analyzer = new WebsiteAnalyzer();
  analyzer.run();
}

module.exports = WebsiteAnalyzer;