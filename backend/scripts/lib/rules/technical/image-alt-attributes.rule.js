const { BaseRule, EvidenceHelper } = require('../base-rule');

class ImageAltAttributesRule extends BaseRule {
  constructor() {
    super(
      'image_alt_attributes',
      'Image Alt Attributes',
      'technical',
      {
        impactScore: 2, // Medium impact
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
    
    const html = content.html || '';
    
    // Find all images
    const imgPattern = /<img[^>]*>/gi;
    const images = html.match(imgPattern) || [];
    const totalImages = images.length;
    
    if (totalImages === 0) {
      evidence.push(EvidenceHelper.info('Image Analysis', 'No images found on page'));
      return this.createResult(100, evidence, issues, {}, recommendations);
    }
    
    // Check alt attributes
    let imagesWithAlt = 0;
    let imagesWithEmptyAlt = 0;
    let imagesWithDescriptiveAlt = 0;
    const emptyAltImages = [];
    
    images.forEach((img) => {
      const altMatch = img.match(/alt=["']([^"']*?)["']/i);
      
      if (altMatch) {
        imagesWithAlt++;
        const altText = altMatch[1].trim();
        
        if (altText.length === 0) {
          imagesWithEmptyAlt++;
          // Extract src for empty alt tracking
          const srcMatch = img.match(/src=["']([^"']*?)["']/i);
          const src = srcMatch ? srcMatch[1] : 'unknown';
          emptyAltImages.push(src);
        } else {
          // Check if alt text is descriptive (≥4 words per CSV specification)
          const wordCount = altText.trim().split(/\s+/).length;
          const isGeneric = /(^(image|photo|picture|img|icon|logo|banner)\d*$)/i.test(altText);
          if (wordCount >= 4 && !isGeneric) {
            imagesWithDescriptiveAlt++;
          }
        }
      }
    });
    
    const altPercentage = (imagesWithAlt / totalImages) * 100;
    const descriptivePercentage = (imagesWithDescriptiveAlt / totalImages) * 100;
    
    // Combined image statistics
    evidence.push(EvidenceHelper.info('Image Analysis',
      `Total images: ${totalImages}, with alt attribute: ${imagesWithAlt} (${altPercentage.toFixed(1)}%), descriptive: ${imagesWithDescriptiveAlt} (${descriptivePercentage.toFixed(1)}%)`
    ));
    
    // Scoring based on descriptive alt text percentage (per CSV specification)
    // Primary score based on descriptive percentage - strict tiers from CSV
    let baseScore = 0;
    if (descriptivePercentage >= 95) {
      baseScore = 100;
      scoreBreakdown.push({ component: 'Excellent: ≥95% images have descriptive alt text', points: 100 });
      evidence.push(EvidenceHelper.success('Alt Quality', '≥95% images have descriptive alt text', {
        score: 100,
        maxScore: 100,
        target: 'Excellent accessibility'
      }));
    } else if (descriptivePercentage >= 75) {
      baseScore = 80;
      scoreBreakdown.push({ component: 'Good: 75-94% images have descriptive alt text', points: 80 });
      evidence.push(EvidenceHelper.success('Alt Quality', '75-94% images have descriptive alt text', {
        score: 80,
        maxScore: 100,
        target: '≥95% for full score'
      }));
    } else if (descriptivePercentage >= 50) {
      baseScore = 60;
      scoreBreakdown.push({ component: 'Moderate: 50-74% images have descriptive alt text', points: 60 });
      evidence.push(EvidenceHelper.warning('Alt Quality', '50-74% images have descriptive alt text', {
        score: 60,
        maxScore: 100,
        target: '≥75% for good score'
      }));
    } else if (descriptivePercentage >= 25) {
      baseScore = 40;
      scoreBreakdown.push({ component: 'Poor: 25-49% images have descriptive alt text', points: 40 });
      evidence.push(EvidenceHelper.warning('Alt Quality', '25-49% images have descriptive alt text', {
        score: 40,
        maxScore: 100,
        target: '≥50% for moderate score'
      }));
    } else {
      baseScore = 20;
      scoreBreakdown.push({ component: 'Very poor: <25% images have descriptive alt text', points: 20 });
      evidence.push(EvidenceHelper.error('Alt Quality', '<25% images have descriptive alt text', {
        score: 20,
        maxScore: 100,
        target: '≥25% for poor score, ≥95% for excellent'
      }));
    }
    
    score = baseScore;
    
    // Show empty alt issues (informational, doesn't affect score per CSV)
    if (imagesWithEmptyAlt > 0) {
      const imageList = emptyAltImages.map((src, index) => {
        const filename = src.split('/').pop() || src;
        return `${index + 1}. ${filename.length > 50 ? filename.substring(0, 47) + '...' : filename}`;
      }).join('\n');
      
      evidence.push(EvidenceHelper.warning('Alt Coverage', `${imagesWithEmptyAlt} images have empty alt attributes`, { 
        code: imageList,
        target: 'Add descriptive alt text for better accessibility'
      }));
      recommendations.push('Add descriptive alt text to images with empty alt attributes');
    }
    
    // Show generic alt issues (informational, doesn't affect score per CSV)
    const genericAltPattern = /alt=["'](?:image|photo|picture|img|icon|logo|banner)\d*["']/gi;
    const genericAlts = html.match(genericAltPattern) || [];
    
    if (genericAlts.length > 0) {
      evidence.push(EvidenceHelper.warning('Alt Quality', `Found ${genericAlts.length} generic alt texts`, {
        target: 'Replace with descriptive alternatives'
      }));
      recommendations.push('Replace generic alt texts with descriptive alternatives');
    }
    
    // Show figure/figcaption usage (informational bonus)
    const figureCount = (html.match(/<figure[^>]*>/gi) || []).length;
    const figcaptionCount = (html.match(/<figcaption[^>]*>/gi) || []).length;
    
    if (figureCount > 0 && figcaptionCount > 0) {
      evidence.push(EvidenceHelper.success('Semantic Markup', `Using semantic figure/figcaption elements`, {
        target: 'Enhances accessibility structure'
      }));
    }
    
    // Add score calculation explanation
    evidence.push(...EvidenceHelper.scoreCalculation(scoreBreakdown, score, 100));
    
    // Generate issues based on problems found
    if (totalImages === 0) {
      // No issue if there are no images
    } else {
      const missingAlts = totalImages - imagesWithAlt;
      
      if (missingAlts > 0) {
        const missingPercentage = Math.round((missingAlts / totalImages) * 100);
        
        if (missingPercentage > 50) {
          issues.push(this.createIssue(
            'critical',
            `${missingAlts} images (${missingPercentage}%) missing alt attributes`,
            'Add alt attributes to all images for accessibility compliance'
          ));
        } else if (missingPercentage > 20) {
          issues.push(this.createIssue(
            'high',
            `${missingAlts} images (${missingPercentage}%) missing alt attributes`,
            'Add alt attributes to improve accessibility'
          ));
        } else {
          issues.push(this.createIssue(
            'medium',
            `${missingAlts} images missing alt attributes`,
            'Add alt attributes for complete accessibility coverage'
          ));
        }
      }
      
      if (imagesWithEmptyAlt > Math.ceil(totalImages * 0.3)) {
        issues.push(this.createIssue(
          'medium',
          `${imagesWithEmptyAlt} images have empty alt attributes`,
          'Replace empty alt attributes with descriptive text',
          emptyAltImages.slice(0, 5) // Show first 5 as affected elements
        ));
      }
      
      if (genericAlts.length > 0) {
        issues.push(this.createIssue(
          'medium',
          `${genericAlts.length} images use generic alt text`,
          'Replace generic alt text with specific descriptions'
        ));
      }
      
      // Check for very low descriptive alt percentage
      if (descriptivePercentage < 25) {
        issues.push(this.createIssue(
          'critical',
          `Only ${descriptivePercentage.toFixed(1)}% of images have descriptive alt text`,
          'Improve alt text quality to be more descriptive (≥4 words)'
        ));
      } else if (descriptivePercentage < 50) {
        issues.push(this.createIssue(
          'high',
          `Only ${descriptivePercentage.toFixed(1)}% of images have descriptive alt text`,
          'Increase descriptive alt text coverage to at least 50%'
        ));
      }
    }
    
    return this.createResult(score, evidence, issues, {}, recommendations);
  }
}

module.exports = ImageAltAttributesRule;