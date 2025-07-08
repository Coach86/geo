// Test aggregation logic
const { RuleAggregator } = require('./lib/rules/aggregator');

// Simulate two rules like in the Authority dimension issue
const results = [
  {
    ruleId: 'citing-sources',
    ruleName: 'Citing Sources',
    score: 50,
    weight: 1,
    contribution: (50 * 1) / 100, // 0.5
    evidence: ['Test evidence 1'],
    issues: []
  },
  {
    ruleId: 'comparison-content',
    ruleName: 'Comparison Content', 
    score: 0,
    weight: 1.5,
    contribution: (0 * 1.5) / 100, // 0
    evidence: ['Test evidence 2'],
    issues: []
  }
];

const ruleDetails = [
  { id: 'citing-sources', name: 'Citing Sources' },
  { id: 'comparison-content', name: 'Comparison Content' }
];

const aggregator = new RuleAggregator();
const result = aggregator.aggregate(results, 'authority', ruleDetails);

console.log('=== Aggregation Test ===');
console.log('Input rules:');
results.forEach((r, i) => {
  console.log(`  ${i+1}. ${r.ruleName}: score=${r.score}, weight=${r.weight}, contribution=${r.contribution}`);
});

console.log('\nCalculation:');
console.log(`Total weighted score: ${results.reduce((sum, r) => sum + r.contribution, 0)}`);
console.log(`Total weight: ${results.reduce((sum, r) => sum + r.weight, 0)}`);

console.log('\nFinal result:');
console.log(`Final Score: ${result.finalScore}`);
console.log(`Expected: Should be around 20 (50*1)/(1+1.5) * 100 = 20`);