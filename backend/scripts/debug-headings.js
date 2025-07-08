const axios = require('axios');
const cheerio = require('cheerio');

async function debugHeadings() {
  try {
    const response = await axios.get('https://www.agryco.com/pieces-agricoles/travail-du-sol/decompacteur/protecton-et-plaque-d-usure/pc5712', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PageIntelligenceBot/1.0)'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('=== Heading Analysis ===');
    console.log('H1 count:', $('h1').length);
    console.log('H2 count:', $('h2').length);
    console.log('H3 count:', $('h3').length);
    console.log('H4 count:', $('h4').length);
    console.log('H5 count:', $('h5').length);
    console.log('H6 count:', $('h6').length);
    
    if ($('h1').length > 0) {
      console.log('\nH1 text:');
      $('h1').each((i, el) => {
        console.log(`- "${$(el).text().trim()}"`);
      });
    }
    
    if ($('h2').length > 0) {
      console.log('\nFirst 5 H2 texts:');
      $('h2').slice(0, 5).each((i, el) => {
        console.log(`- "${$(el).text().trim()}"`);
      });
    }
    
    // Check for any headings at all
    const allHeadings = $('h1, h2, h3, h4, h5, h6');
    console.log('\nTotal headings found:', allHeadings.length);
    
    // Check if this might be a SPA with dynamic content
    const scriptTags = $('script').length;
    console.log('Script tags found:', scriptTags);
    
    // Check page title
    console.log('Page title:', $('title').text());
    
  } catch (error) {
    console.error('Error fetching page:', error.message);
  }
}

debugHeadings();