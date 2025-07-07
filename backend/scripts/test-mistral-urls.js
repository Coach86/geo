require('dotenv').config();
const { Mistral } = require('@mistralai/mistralai');

async function testMistralUrls() {
  const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });
  
  const prompt = "What are the top 5 technology companies in 2024? Please provide their websites.";
  
  console.log("Testing Mistral URL extraction...");
  console.log("Prompt:", prompt);
  console.log("---");
  
  const response = await mistral.chat.complete({
    model: 'mistral-medium-2505',
    messages: [
      { 
        role: 'system', 
        content: 'You are a knowledgeable assistant. When discussing companies, products, or services, please cite relevant sources or websites when available.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
  });
  
  const text = response.choices[0].message.content;
  console.log("Response:", text);
  console.log("---");
  
  // Extract URLs
  const urlRegex = /https?:\/\/[^\s\)\]]+/g;
  const urls = text.match(urlRegex) || [];
  
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  let match;
  const foundUrls = new Set();
  
  while ((match = markdownLinkRegex.exec(text)) !== null) {
    foundUrls.add(match[2]);
  }
  
  for (const url of urls) {
    foundUrls.add(url);
  }
  
  console.log("Extracted URLs:", Array.from(foundUrls));
}

testMistralUrls().catch(console.error);