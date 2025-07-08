import { Injectable, Logger } from '@nestjs/common';
import { BaseAEORule } from '../rules/aeo/base-aeo.rule';
import { Category, PageApplicability } from '../interfaces/rule.interface';
import { LlmService } from '../../llm/services/llm.service';

// Technical Rules
import { CleanHtmlStructureRule } from '../rules/aeo/technical/clean-html-structure.rule';
import { HttpsSecurityRule } from '../rules/aeo/technical/https-security.rule';
import { MobileOptimizationRule } from '../rules/aeo/technical/mobile-optimization.rule';
import { LlmsTxtRule } from '../rules/aeo/technical/llms-txt.rule';
import { RobotsTxtRule } from '../rules/aeo/technical/robots-txt.rule';
import { StatusCodeRule } from '../rules/aeo/technical/status-code.rule';
import { StructuredDataRule } from '../rules/aeo/technical/structured-data.rule';
import { UrlStructureRule } from '../rules/aeo/technical/url-structure.rule';
import { XmlSitemapRule } from '../rules/aeo/technical/xml-sitemap.rule';

// Content Rules
import { HowToContentRule } from '../rules/aeo/content/how-to-content.rule';
import { DefinitionalContentRule } from '../rules/aeo/content/definitional-content.rule';
import { CaseStudiesRule } from '../rules/aeo/content/case-studies.rule';
import { ContentFreshnessRule } from '../rules/aeo/content/content-freshness.rule';
import { FAQPagesRule } from '../rules/aeo/content/faq-pages.rule';
import { ImageAltRule } from '../rules/aeo/technical/image-alt.rule';
import { MainHeadingRule } from '../rules/aeo/content/main-heading.rule';
import { MetaDescriptionRule } from '../rules/aeo/content/meta-description.rule';
import { GlossariesRule } from '../rules/aeo/content/glossaries.rule';
import { InDepthGuidesRule } from '../rules/aeo/content/in-depth-guides.rule';
import { MultimodalContentRule } from '../rules/aeo/content/multimodal-content.rule';
import { SubheadingsRule } from '../rules/aeo/content/subheadings.rule';

// Authority Rules
import { AuthorCredentialsRule } from '../rules/aeo/authority/author-credentials.rule';
import { CitingSourcesRule } from '../rules/aeo/content/citing-sources.rule';
import { ComparisonContentRule } from '../rules/aeo/content/comparison-content.rule';
import { ConciseAnswersRule } from '../rules/aeo/content/concise-answers.rule';
import { IndustryPublicationsRule } from '../rules/aeo/authority/industry-publications.rule';
import { PressReleaseRule } from '../rules/aeo/authority/press-release.rule';
import { WikipediaPresenceRule } from '../rules/aeo/authority/wikipedia-presence.rule';
import { WikidataPresenceRule } from '../rules/aeo/authority/wikidata-presence.rule';

// Quality Rules (content type and format analysis)

@Injectable()
export class AEORuleRegistryService {
  private readonly logger = new Logger(AEORuleRegistryService.name);
  private rules: Map<string, BaseAEORule> = new Map();
  private enabledRules: Set<string> = new Set();

  constructor(
    private readonly llmService: LlmService
  ) {
    this.registerAllRules();
  }

  private registerAllRules(): void {
    this.logger.log('Registering AEO rules...');
    
    // Technical Rules
    this.register(new CleanHtmlStructureRule());
    this.register(new HttpsSecurityRule());
    this.register(new MobileOptimizationRule());
    this.register(new LlmsTxtRule());
    this.register(new RobotsTxtRule());
    this.register(new StatusCodeRule());
    this.register(new StructuredDataRule());
    this.register(new UrlStructureRule(this.llmService));
    this.register(new XmlSitemapRule());
    this.register(new ImageAltRule());
    
    // Structure Rules
    this.register(new HowToContentRule());
    this.register(new DefinitionalContentRule(this.llmService));
    this.register(new CaseStudiesRule(this.llmService));
    this.register(new ContentFreshnessRule());
    this.register(new FAQPagesRule());
    this.register(new MainHeadingRule());
    this.register(new MetaDescriptionRule(this.llmService));
    this.register(new GlossariesRule());
    this.register(new InDepthGuidesRule(this.llmService));
    this.register(new MultimodalContentRule());
    this.register(new SubheadingsRule());
    
    // Authority Rules
    this.register(new AuthorCredentialsRule());
    this.register(new CitingSourcesRule(this.llmService));
    this.register(new ComparisonContentRule(this.llmService));
    this.register(new ConciseAnswersRule(this.llmService));
    this.register(new IndustryPublicationsRule(this.llmService));
    this.register(new PressReleaseRule(this.llmService));
    this.register(new WikipediaPresenceRule());
    this.register(new WikidataPresenceRule());
    
    
    this.logger.log(`Registered ${this.rules.size} AEO rules`);
  }

  private register(rule: BaseAEORule): void {
    this.rules.set(rule.id, rule);
    this.enabledRules.add(rule.id); // Enable by default
    this.logger.debug(`Registered rule: ${rule.id} (${rule.name})`);
  }

  getRuleById(id: string): BaseAEORule | undefined {
    return this.rules.get(id);
  }

  getAllRules(): BaseAEORule[] {
    return Array.from(this.rules.values());
  }

  getActiveRules(): BaseAEORule[] {
    return Array.from(this.rules.values()).filter(rule => 
      this.enabledRules.has(rule.id)
    );
  }

  getRulesByCategory(category: Category): BaseAEORule[] {
    return this.getActiveRules().filter(rule => rule.category === category);
  }

  getRulesForPageType(pageType: keyof PageApplicability): BaseAEORule[] {
    return this.getActiveRules().filter(rule => 
      rule.isApplicableToPageType(pageType)
    );
  }

  getRulesForUrl(url: string, pageType: keyof PageApplicability): BaseAEORule[] {
    // Get rules that apply to this page type (page-level only)
    const pageRules = this.getRulesForPageType(pageType).filter(rule => 
      rule.applicationLevel === 'Page'
    );
    
    return pageRules;
  }

  getDomainRules(): BaseAEORule[] {
    // Get domain-level rules only
    return this.getActiveRules().filter(rule => 
      rule.applicationLevel === 'Domain'
    );
  }

  toggleRule(ruleId: string, enabled: boolean): void {
    if (!this.rules.has(ruleId)) {
      throw new Error(`Rule ${ruleId} not found`);
    }
    
    if (enabled) {
      this.enabledRules.add(ruleId);
      this.logger.log(`Enabled rule: ${ruleId}`);
    } else {
      this.enabledRules.delete(ruleId);
      this.logger.log(`Disabled rule: ${ruleId}`);
    }
  }

  getCategoryWeights(): Record<Category, number> {
    // Default weights for categories
    return {
      'TECHNICAL': 1.5,
      'STRUCTURE': 2.0,
      'AUTHORITY': 1.0,
      'QUALITY': 0.5
    };
  }

  getRuleSummary(): { total: number; byCategory: Record<Category, number>; enabled: number } {
    const summary = {
      total: this.rules.size,
      enabled: this.enabledRules.size,
      byCategory: {
        'TECHNICAL': 0,
        'STRUCTURE': 0,
        'AUTHORITY': 0,
        'QUALITY': 0
      } as Record<Category, number>
    };
    
    this.rules.forEach(rule => {
      const category = rule.category as keyof Record<Category, number>;
      summary.byCategory[category]++;
    });
    
    return summary;
  }
}