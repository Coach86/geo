import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  // Create a dummy company
  const companyId = uuidv4();
  
  const identityCard = await prisma.identityCard.create({
    data: {
      id: companyId,
      brandName: 'Acme Corporation',
      website: 'https://acme.example.com',
      industry: 'Technology',
      shortDescription: 'Innovative tech solutions for businesses',
      fullDescription: 'Acme Corporation is a global technology company specializing in cloud services, AI solutions, and enterprise software. Founded in 2010, Acme has grown to become a leader in business technology innovation.',
      keyFeaturesJson: JSON.stringify([
        'Cloud Infrastructure Services',
        'AI and Machine Learning Solutions',
        'Enterprise Software',
        'Technology Consulting',
        'Cybersecurity Services'
      ]),
      competitorsJson: JSON.stringify([
        'TechGiant Inc.',
        'InnovateTech',
        'CloudSoft Systems',
        'Enterprise Solutions Co.'
      ]),
      data: "{}",
    },
  });

  console.log(`Created identity card for ${identityCard.brandName}`);

  // Create prompt set for the company
  const promptSet = await prisma.promptSet.create({
    data: {
      companyId: companyId,
      spontaneous: JSON.stringify([
        'What are the top cloud infrastructure providers?',
        'Which companies are leading in AI and machine learning solutions?',
        'Name some enterprise software providers you know.',
        'What technology consulting firms are well-regarded?',
        'Which cybersecurity companies are most innovative?',
        'Who are the market leaders in business technology?',
        'What companies offer the best cloud services for enterprises?',
        'Which tech companies have the strongest enterprise offerings?',
        'Name innovative companies in the technology sector.',
        'What technology companies are growing the fastest?',
        'Which enterprise software companies have the best reputation?',
        'What technology companies are disrupting the market?'
      ]),
      direct: JSON.stringify([
        'What do you know about Acme Corporation?',
        'Is Acme Corporation a reputable technology company?',
        'What services does Acme Corporation offer?',
        'How would you rate Acme Corporation compared to other tech companies?',
        'What are Acme Corporation\'s strengths in the technology sector?',
        'Is Acme Corporation known for innovation?',
        'What is the market perception of Acme Corporation?',
        'Does Acme Corporation have good enterprise solutions?',
        'How effective are Acme Corporation\'s cloud services?',
        'Is Acme Corporation a leader in AI solutions?',
        'What is Acme Corporation\'s reputation for cybersecurity?',
        'Would you recommend Acme Corporation for technology consulting?'
      ]),
      comparison: JSON.stringify([
        'Compare Acme Corporation and TechGiant Inc. Which is better overall?',
        'How do Acme Corporation\'s products compare to InnovateTech\'s offerings?',
        'Compare the pricing models of Acme Corporation and CloudSoft Systems.',
        'Which has better innovation: Acme Corporation or Enterprise Solutions Co.?',
        'Compare customer service between Acme Corporation and its competitors.',
        'Which has greater market share: Acme Corporation or TechGiant Inc.?',
        'Compare the sustainability practices of Acme Corporation and InnovateTech.',
        'What is the future outlook for Acme Corporation compared to competitors?'
      ]),
    },
  });

  const spontaneousPrompts = JSON.parse(promptSet.spontaneous);
  const directPrompts = JSON.parse(promptSet.direct);
  const comparisonPrompts = JSON.parse(promptSet.comparison);

  console.log(`Created prompt set with ${spontaneousPrompts.length} spontaneous prompts, ${directPrompts.length} direct prompts, and ${comparisonPrompts.length} comparison prompts`);

  // Create a weekly report
  const monday = new Date();
  monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
  monday.setHours(0, 0, 0, 0);

  const spontaneousData = {
    results: [
      {
        llmProvider: 'OpenAI',
        promptIndex: 0,
        mentioned: true,
        topOfMind: ['AWS', 'Google Cloud', 'Microsoft Azure', 'Acme Corporation', 'IBM Cloud']
      },
      {
        llmProvider: 'Anthropic',
        promptIndex: 0,
        mentioned: false,
        topOfMind: ['AWS', 'Google Cloud', 'Microsoft Azure', 'IBM Cloud', 'Oracle Cloud']
      }
    ],
    summary: {
      mentionRate: 0.5,
      topMentions: ['AWS', 'Google Cloud', 'Microsoft Azure']
    }
  };

  const sentimentData = {
    results: [
      {
        llmProvider: 'OpenAI',
        promptIndex: 0,
        sentiment: 'positive',
        accuracy: 0.85,
        extractedFacts: ['Cloud services provider', 'Enterprise solutions', 'Founded in 2010']
      },
      {
        llmProvider: 'Anthropic',
        promptIndex: 0,
        sentiment: 'neutral',
        accuracy: 0.75,
        extractedFacts: ['Technology company', 'Cloud services', 'AI solutions']
      }
    ],
    summary: {
      overallSentiment: 'positive',
      averageAccuracy: 0.8
    }
  };

  const comparisonData = {
    results: [
      {
        llmProvider: 'OpenAI',
        promptIndex: 0,
        winner: 'Acme Corporation',
        differentiators: ['Better customer service', 'More innovative solutions', 'Stronger integration capabilities']
      },
      {
        llmProvider: 'Anthropic',
        promptIndex: 0,
        winner: 'TechGiant Inc.',
        differentiators: ['Larger market share', 'More established brand', 'Wider range of products']
      }
    ],
    summary: {
      winRate: 0.5,
      keyDifferentiators: ['Customer service', 'Innovation', 'Integration capabilities']
    }
  };

  const llmVersionsData = {
    'OpenAI': 'gpt-4o-2023-05-01',
    'Anthropic': 'claude-3-opus-20240229'
  };

  const weeklyReport = await prisma.weeklyReport.create({
    data: {
      companyId: companyId,
      weekStart: monday,
      spontaneous: JSON.stringify(spontaneousData),
      sentiment: JSON.stringify(sentimentData),
      comparison: JSON.stringify(comparisonData),
      llmVersions: JSON.stringify(llmVersionsData),
      generatedAt: new Date(),
    },
  });

  console.log(`Created weekly report for week starting ${weeklyReport.weekStart.toISOString().split('T')[0]}`);

  // Create raw responses
  await prisma.rawResponse.create({
    data: {
      reportId: weeklyReport.id,
      llmProvider: 'OpenAI',
      promptType: 'spontaneous',
      promptIndex: 0,
      response: 'The top cloud infrastructure providers currently include AWS (Amazon Web Services), Google Cloud Platform, Microsoft Azure, IBM Cloud, and Acme Corporation. AWS is the market leader with the broadest range of services, followed closely by Microsoft Azure and Google Cloud.'
    }
  });

  console.log('Created sample raw response');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });