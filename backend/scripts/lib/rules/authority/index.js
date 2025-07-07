// Export authority rules (simplified for standalone script)
module.exports = [
  require('./author-credentials.rule'),
  require('./citing-sources.rule')
  // comparison-content-llm.rule is added conditionally in rule-engine-with-filtering.js
];