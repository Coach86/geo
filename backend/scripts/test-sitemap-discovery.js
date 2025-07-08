const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { discoverUrlsFromSitemaps } = require('./lib/sitemap-parser');

async function testSitemapDiscovery() {
  console.log('Testing sitemap discovery...\n');
  
  const testUrls = [
    'https://blog.google',
    'https://techcrunch.com',
    'https://medium.com'
  ];
  
  for (const url of testUrls) {
    console.log(`\n=== Testing ${url} ===`);
    
    try {
      const urls = await discoverUrlsFromSitemaps(url, {
        maxUrls: 10,
        maxDepth: 2
      });
      
      console.log(`\nDiscovered ${urls.length} URLs:`);
      urls.slice(0, 5).forEach((urlEntry, index) => {
        console.log(`  ${index + 1}. ${urlEntry.url}`);
        if (urlEntry.priority) console.log(`     Priority: ${urlEntry.priority}`);
        if (urlEntry.lastmod) console.log(`     Last modified: ${urlEntry.lastmod}`);
      });
      
      if (urls.length > 5) {
        console.log(`  ... and ${urls.length - 5} more URLs`);
      }
      
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
    
    console.log('─'.repeat(50));
  }
}

if (require.main === module) {
  testSitemapDiscovery().catch(console.error);
}

module.exports = { testSitemapDiscovery };