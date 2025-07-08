// Export quality rules (simplified for standalone script)
module.exports = [
  require('./in-depth-guides-llm.rule'),
  require('../content/content-freshness.rule') // Moved from content to quality dimension
];