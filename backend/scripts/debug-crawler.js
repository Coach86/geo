const { initDatabase } = require('./lib/database');

function debugCrawler() {
  const db = initDatabase();
  
  console.log('=== Debugging getUncrawledUrls function ===');
  
  // Test the exact query used in getUncrawledUrls
  const domain = 'www.lehibou.com';
  
  console.log(`\n1. Total discovered URLs for ${domain}:`);
  const totalUrls = db.prepare(`
    SELECT COUNT(*) as count FROM discovered_urls 
    WHERE domain = ?
  `).get(domain);
  console.log(`   Total: ${totalUrls.count}`);
  
  console.log(`\n2. Uncrawled URLs for ${domain}:`);
  const uncrawledUrls = db.prepare(`
    SELECT COUNT(*) as count FROM discovered_urls 
    WHERE domain = ? AND crawled = 0
  `).get(domain);
  console.log(`   Uncrawled: ${uncrawledUrls.count}`);
  
  console.log(`\n3. Testing homepage priority query:`);
  const homepageUrls = db.prepare(`
    SELECT url FROM discovered_urls 
    WHERE domain = ? AND crawled = 0 
    AND (url LIKE 'https://' || ? || '/' OR url LIKE 'https://' || ? OR url LIKE 'http://' || ? || '/' OR url LIKE 'http://' || ?)
    ORDER BY url
    LIMIT 1
  `).all(domain, domain, domain, domain, domain);
  
  console.log(`   Homepage URLs found: ${homepageUrls.length}`);
  homepageUrls.forEach(row => console.log(`   - ${row.url}`));
  
  console.log(`\n4. Testing remaining URLs query:`);
  const remainingUrls = db.prepare(`
    SELECT url FROM discovered_urls 
    WHERE domain = ? AND crawled = 0 
    AND NOT (url LIKE 'https://' || ? || '/' OR url LIKE 'https://' || ? OR url LIKE 'http://' || ? || '/' OR url LIKE 'http://' || ?)
    ORDER BY RANDOM()
    LIMIT 5
  `).all(domain, domain, domain, domain, domain);
  
  console.log(`   Remaining URLs found: ${remainingUrls.length}`);
  remainingUrls.forEach(row => console.log(`   - ${row.url}`));
  
  console.log(`\n5. Sample of all uncrawled URLs:`);
  const sampleUrls = db.prepare(`
    SELECT url, source_url FROM discovered_urls 
    WHERE domain = ? AND crawled = 0
    LIMIT 5
  `).all(domain);
  
  sampleUrls.forEach(row => console.log(`   - ${row.url} (source: ${row.source_url})`));
  
  db.close();
}

if (require.main === module) {
  debugCrawler();
}

module.exports = { debugCrawler };