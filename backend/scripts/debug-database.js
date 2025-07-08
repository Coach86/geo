const { initDatabase } = require('./lib/database');

function debugDatabase() {
  const db = initDatabase();
  
  console.log('=== Checking cached pages for www.lehibou.com ===');
  const cachedPages = db.prepare(`
    SELECT url, domain, status_code, crawled_at, error 
    FROM crawled_pages 
    WHERE domain = ? 
    ORDER BY crawled_at DESC
  `).all('www.lehibou.com');
  
  console.log(`Found ${cachedPages.length} cached pages:`);
  cachedPages.forEach((page, index) => {
    console.log(`  ${index + 1}. ${page.url}`);
    console.log(`     Status: ${page.status_code}, Error: ${page.error || 'None'}`);
    console.log(`     Crawled: ${page.crawled_at}`);
  });
  
  console.log('\n=== Checking discovered URLs for www.lehibou.com ===');
  const discoveredUrls = db.prepare(`
    SELECT url, source_url, crawled, discovered_at 
    FROM discovered_urls 
    WHERE domain = ? 
    ORDER BY discovered_at DESC
  `).all('www.lehibou.com');
  
  console.log(`Found ${discoveredUrls.length} discovered URLs:`);
  discoveredUrls.forEach((url, index) => {
    console.log(`  ${index + 1}. ${url.url}`);
    console.log(`     Source: ${url.source_url || 'None'}`);
    console.log(`     Crawled: ${url.crawled ? 'Yes' : 'No'}`);
  });
  
  db.close();
}

if (require.main === module) {
  debugDatabase();
}

module.exports = { debugDatabase };