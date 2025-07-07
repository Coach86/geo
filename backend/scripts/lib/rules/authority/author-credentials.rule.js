const { BaseRule, EvidenceHelper } = require('../base-rule');

class AuthorCredentialsRule extends BaseRule {
  constructor() {
    super(
      'author_credentials',
      'Author Credentials',
      'authority',
      {
        impactScore: 2, // Medium-high impact
        pageTypes: [], // Applies to all page types
        isDomainLevel: false
      }
    );
  }

  async evaluate(url, content) {
    const evidence = [];
    const issues = [];
    const recommendations = [];
    let score = 0;
    const scoreBreakdown = [];
    const $ = content.$;

    try {
      // Check for author information in various places
      const authorSignals = {
        schemaAuthor: false,
        metaAuthor: false,
        byline: false,
        authorBio: false,
        authorPage: false
      };

      // Check schema.org structured data
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const data = JSON.parse($(el).html());
          if (data.author || (data['@graph'] && data['@graph'].some(item => item.author))) {
            authorSignals.schemaAuthor = true;
          }
        } catch {}
      });

      // Check meta tags
      if ($('meta[name="author"]').attr('content')) {
        authorSignals.metaAuthor = true;
      }

      // Check for byline patterns
      const bylinePatterns = [
        /by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
        /author:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i,
        /written\s+by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i
      ];
      
      const bodyText = $('body').text();
      for (const pattern of bylinePatterns) {
        if (pattern.test(bodyText)) {
          authorSignals.byline = true;
          break;
        }
      }

      // Check for author bio section
      const bioIndicators = ['about the author', 'author bio', 'about me', 'written by'];
      const lowerBodyText = bodyText.toLowerCase();
      authorSignals.authorBio = bioIndicators.some(indicator => lowerBodyText.includes(indicator));

      // Check for author page link
      authorSignals.authorPage = $('a[href*="/author/"], a[href*="/about/"], a[href*="/team/"]').length > 0;

      // Calculate score based on signals
      const signalCount = Object.values(authorSignals).filter(v => v).length;
      
      if (signalCount === 0) {
        score = 0;
        scoreBreakdown.push({ component: 'No author signals', points: 0 });
        evidence.push(EvidenceHelper.error('Author', 'No author information found'));
        issues.push(this.createIssue(
          'high',
          'Missing author information',
          'Add author name and credentials to establish authority'
        ));
      } else {
        score = Math.min(100, signalCount * 20);
        scoreBreakdown.push({ component: `${signalCount} author signals`, points: score });
        
        if (authorSignals.schemaAuthor) {
          evidence.push(EvidenceHelper.success('Schema', 'Author in structured data'));
        }
        if (authorSignals.metaAuthor) {
          evidence.push(EvidenceHelper.success('Meta', 'Author in meta tag'));
        }
        if (authorSignals.byline) {
          evidence.push(EvidenceHelper.success('Byline', 'Author byline found'));
        }
        if (authorSignals.authorBio) {
          evidence.push(EvidenceHelper.success('Bio', 'Author bio section present'));
        }
        if (authorSignals.authorPage) {
          evidence.push(EvidenceHelper.success('Link', 'Link to author page found'));
        }
        
        if (signalCount < 3) {
          recommendations.push('Add more author signals (bio, structured data, author page)');
        }
      }

    } catch (error) {
      evidence.push(EvidenceHelper.error('Author', `Error checking author credentials: ${error.message}`));
      score = 0;
    }

    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }
}

module.exports = AuthorCredentialsRule;