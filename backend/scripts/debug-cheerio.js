const axios = require('axios');
const cheerio = require('cheerio');

async function debugCheerio() {
  try {
    const response = await axios.get('https://www.agryco.com/pieces-agricoles/travail-du-sol/decompacteur/protecton-et-plaque-d-usure/pc5712', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    console.log('=== Cheerio vs Raw HTML Analysis ===');
    console.log('Raw HTML length:', html.length);
    console.log('Raw HTML contains <h2?', html.includes('<h2'));
    console.log('Cheerio H2 count:', $('h2').length);
    
    if ($('h2').length > 0) {
      console.log('First H2 outer HTML:', $('h2').first().prop('outerHTML'));
      console.log('First H2 text:', $('h2').first().text());
    }
    
    // Check if there are any heading-like elements
    console.log('Elements with "h2" in HTML:', (html.match(/h2/gi) || []).length);
    
    // Look for common patterns that might be H2s
    console.log('class="h2":', (html.match(/class="[^"]*h2[^"]*"/gi) || []).length);
    console.log('role="heading":', (html.match(/role="heading"/gi) || []).length);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugCheerio();