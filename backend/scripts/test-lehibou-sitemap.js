const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { discoverUrlsFromSitemaps, fetchSitemap } = require('./lib/sitemap-parser');

async function testLehibouSitemap() {
  console.log('Testing Le Hibou sitemap discovery...\n');
  
  const url = 'https://www.lehibou.com';
  
  try {
    // First, let's manually fetch the main sitemap to see what's inside
    console.log('=== Manual Sitemap Inspection ===');
    
    const mainSitemap = await fetchSitemap('https://www.lehibou.com/sitemap.xml', 'www.lehibou.com');
    console.log('Main sitemap structure:');
    console.log(`  Type: ${mainSitemap.type}`);
    console.log(`  URLs: ${mainSitemap.urls.length}`);
    console.log(`  Nested sitemaps: ${mainSitemap.sitemaps.length}`);
    
    if (mainSitemap.sitemaps.length > 0) {
      console.log('\nNested sitemap URLs:');
      mainSitemap.sitemaps.forEach((sitemap, index) => {
        console.log(`  ${index + 1}. ${sitemap.url}`);
      });
      
      // Try fetching the first nested sitemap
      if (mainSitemap.sitemaps[0]) {
        console.log(`\n=== Testing First Nested Sitemap ===`);
        try {
          const nestedSitemap = await fetchSitemap(mainSitemap.sitemaps[0].url, 'www.lehibou.com');
          console.log(`Nested sitemap structure:`);
          console.log(`  Type: ${nestedSitemap.type}`);
          console.log(`  URLs: ${nestedSitemap.urls.length}`);
          console.log(`  Nested sitemaps: ${nestedSitemap.sitemaps.length}`);
          
          if (nestedSitemap.urls.length > 0) {
            console.log('\nFirst 3 URLs:');
            nestedSitemap.urls.slice(0, 3).forEach((url, index) => {
              console.log(`  ${index + 1}. ${url.url}`);
            });
          }
        } catch (error) {
          console.log(`Error fetching nested sitemap: ${error.message}`);
        }
      }
    }
    
    console.log('\n=== Full Discovery Process ===');
    const urls = await discoverUrlsFromSitemaps(url, {
      maxUrls: 20,
      maxDepth: 3
    });
    
    console.log(`\nFinal result: ${urls.length} URLs discovered`);
    urls.forEach((urlEntry, index) => {
      console.log(`  ${index + 1}. ${urlEntry.url}`);
      if (urlEntry.priority) console.log(`     Priority: ${urlEntry.priority}`);
    });
    
  } catch (error) {
    console.log(`Error: ${error.message}`);
    console.log(error.stack);
  }
}

if (require.main === module) {
  testLehibouSitemap().catch(console.error);
}

module.exports = { testLehibouSitemap };