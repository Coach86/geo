const axios = require('axios');

async function debugContent() {
  try {
    const response = await axios.get('https://www.agryco.com/pieces-agricoles/travail-du-sol/decompacteur/protecton-et-plaque-d-usure/pc5712', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PageIntelligenceBot/1.0)'
      }
    });
    
    const html = response.data;
    
    console.log('=== HTML Content Analysis ===');
    console.log('Total HTML length:', html.length);
    
    // Test different regex patterns
    const patterns = [
      { name: 'Original (broken)', regex: /<h2[^>]*>([^<]+)<\/h2>/gi },
      { name: 'Fixed', regex: /<h2[^>]*>.*?<\/h2>/gi },
      { name: 'H5 pattern', regex: /<h5[^>]*>.*?<\/h5>/gi }
    ];
    
    patterns.forEach(pattern => {
      const matches = html.match(pattern.regex) || [];
      console.log(`${pattern.name}: ${matches.length} matches`);
      if (matches.length > 0 && matches.length <= 3) {
        matches.forEach((match, i) => {
          console.log(`  ${i+1}: ${match.substring(0, 100)}...`);
        });
      }
    });
    
    // Check if content might be in a specific section
    console.log('\n=== Content sections ===');
    const bodyStart = html.indexOf('<body');
    const bodyEnd = html.indexOf('</body>');
    if (bodyStart !== -1 && bodyEnd !== -1) {
      const bodyContent = html.substring(bodyStart, bodyEnd);
      const h2InBody = bodyContent.match(/<h2[^>]*>.*?<\/h2>/gi) || [];
      console.log('H2 in body:', h2InBody.length);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugContent();