import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

interface RuleApplicationResult {
  content: string;
  appliedRules: string[];
}

@Injectable()
export class ContentRuleApplicatorService {
  private readonly logger = new Logger(ContentRuleApplicatorService.name);

  async applyRules(content: string, title: string): Promise<RuleApplicationResult> {
    const appliedRules: string[] = [];
    let processedContent = content;

    // Convert markdown to HTML for processing
    const html = this.markdownToHtml(processedContent);
    const $ = cheerio.load(html);

    // Apply main heading rule
    if (this.applyMainHeadingRule($, title)) {
      appliedRules.push('main-heading');
    }

    // Apply subheading structure
    if (this.applySubheadingStructure($)) {
      appliedRules.push('subheading-structure');
    }

    // Apply content length optimization
    if (this.optimizeContentLength($)) {
      appliedRules.push('content-length-optimization');
    }

    // Apply citation formatting
    if (this.applyCitationFormatting($)) {
      appliedRules.push('citation-formatting');
    }

    // Apply SEO optimization
    if (this.applySEOOptimization($, title)) {
      appliedRules.push('seo-optimization');
    }

    // Convert back to markdown
    processedContent = this.htmlToMarkdown($.html());

    this.logger.log(`Applied ${appliedRules.length} content rules`);
    return {
      content: processedContent,
      appliedRules,
    };
  }

  private applyMainHeadingRule($: cheerio.CheerioAPI, title: string): boolean {
    try {
      // Ensure there's exactly one H1
      const h1Count = $('h1').length;
      
      if (h1Count === 0) {
        // Add H1 at the beginning
        $('body').prepend(`<h1>${this.escapeHtml(title)}</h1>`);
        return true;
      } else if (h1Count > 1) {
        // Convert extra H1s to H2s
        $('h1').each((index, element) => {
          if (index > 0) {
            $(element).replaceWith(`<h2>${$(element).text()}</h2>`);
          }
        });
        return true;
      }

      // Check H1 quality
      const h1Text = $('h1').first().text().trim();
      const wordCount = h1Text.split(/\s+/).length;
      
      if (wordCount < 3 || wordCount > 10) {
        // Replace with optimized title
        $('h1').first().text(title);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error applying main heading rule: ${error.message}`);
      return false;
    }
  }

  private applySubheadingStructure($: cheerio.CheerioAPI): boolean {
    try {
      let modified = false;

      // Ensure proper heading hierarchy
      const headings = $('h1, h2, h3, h4, h5, h6');
      let lastLevel = 1;

      headings.each((index, element) => {
        const tagName = element.tagName.toLowerCase();
        const currentLevel = parseInt(tagName.charAt(1));

        // Fix heading jumps (e.g., h1 -> h3)
        if (currentLevel > lastLevel + 1) {
          const newLevel = lastLevel + 1;
          $(element).replaceWith(`<h${newLevel}>${$(element).text()}</h${newLevel}>`);
          modified = true;
        }

        lastLevel = Math.min(currentLevel, lastLevel + 1);
      });

      // Add subheadings if content is too long without structure
      const paragraphs = $('p');
      const totalParagraphs = paragraphs.length;
      
      if (totalParagraphs > 10) {
        const h2Count = $('h2').length;
        if (h2Count < Math.floor(totalParagraphs / 5)) {
          // Add section headings every 5 paragraphs if missing
          let sectionCount = 1;
          paragraphs.each((index, element) => {
            if (index > 0 && index % 5 === 0 && !$(element).prev().is('h2')) {
              $(element).before(`<h2>Section ${sectionCount}</h2>`);
              sectionCount++;
              modified = true;
            }
          });
        }
      }

      return modified;
    } catch (error) {
      this.logger.error(`Error applying subheading structure: ${error.message}`);
      return false;
    }
  }

  private optimizeContentLength($: cheerio.CheerioAPI): boolean {
    try {
      let modified = false;

      // Split long paragraphs
      $('p').each((index, element) => {
        const text = $(element).text();
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        
        if (sentences.length > 5) {
          // Split into multiple paragraphs
          const midPoint = Math.floor(sentences.length / 2);
          const firstHalf = sentences.slice(0, midPoint).join(' ');
          const secondHalf = sentences.slice(midPoint).join(' ');
          
          $(element).replaceWith(`<p>${firstHalf}</p><p>${secondHalf}</p>`);
          modified = true;
        }
      });

      // Add lists for better readability
      $('p').each((index, element) => {
        const text = $(element).text();
        
        // Check for list-like content
        if (text.includes(':') && (text.includes(';') || text.includes(','))) {
          const parts = text.split(':');
          if (parts.length === 2) {
            const intro = parts[0];
            const items = parts[1].split(/[;,]/).map(item => item.trim()).filter(item => item);
            
            if (items.length > 2) {
              const listHtml = `<p>${intro}:</p><ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
              $(element).replaceWith(listHtml);
              modified = true;
            }
          }
        }
      });

      return modified;
    } catch (error) {
      this.logger.error(`Error optimizing content length: ${error.message}`);
      return false;
    }
  }

  private applyCitationFormatting($: cheerio.CheerioAPI): boolean {
    try {
      let modified = false;

      // Look for inline citations and format them properly
      $('p').each((index, element) => {
        let text = $(element).html() || '';
        
        // Format URLs as proper links
        const urlRegex = /(?<!href=["'])(https?:\/\/[^\s<]+)/g;
        if (urlRegex.test(text)) {
          text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">source</a>');
          $(element).html(text);
          modified = true;
        }

        // Format citations in brackets
        const citationRegex = /\[([^\]]+)\]/g;
        if (citationRegex.test(text)) {
          text = text.replace(citationRegex, '<sup>[$1]</sup>');
          $(element).html(text);
          modified = true;
        }
      });

      return modified;
    } catch (error) {
      this.logger.error(`Error applying citation formatting: ${error.message}`);
      return false;
    }
  }

  private applySEOOptimization($: cheerio.CheerioAPI, title: string): boolean {
    try {
      let modified = false;

      // Ensure first paragraph is engaging (for meta description)
      const firstParagraph = $('p').first();
      if (firstParagraph.length > 0) {
        const text = firstParagraph.text();
        if (text.length < 100 || text.length > 160) {
          // This would need more sophisticated logic in production
          modified = true;
        }
      }

      // Add keyword emphasis
      const keywords = this.extractKeywords(title);
      if (keywords.length > 0) {
        $('p').each((index, element) => {
          let text = $(element).html() || '';
          keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
            if (regex.test(text) && !text.includes(`<strong>${keyword}</strong>`)) {
              // Bold first occurrence
              text = text.replace(regex, '<strong>$1</strong>');
              modified = true;
            }
          });
          if (modified) {
            $(element).html(text);
          }
        });
      }

      return modified;
    } catch (error) {
      this.logger.error(`Error applying SEO optimization: ${error.message}`);
      return false;
    }
  }

  private extractKeywords(title: string): string[] {
    // Simple keyword extraction from title
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];
    return title
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 3);
  }

  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  private markdownToHtml(markdown: string): string {
    // Simple markdown to HTML conversion
    let html = markdown;
    
    // Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Lists
    html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // Paragraphs
    html = html.split('\n\n').map(para => {
      if (!para.match(/^<[^>]+>/)) {
        return `<p>${para}</p>`;
      }
      return para;
    }).join('\n');
    
    return `<body>${html}</body>`;
  }

  private htmlToMarkdown(html: string): string {
    const $ = cheerio.load(html);
    
    let markdown = '';
    
    // Process elements in order
    $('body').children().each((index, element) => {
      const tagName = element.tagName.toLowerCase();
      
      switch (tagName) {
        case 'h1':
          markdown += `# ${$(element).text()}\n\n`;
          break;
        case 'h2':
          markdown += `## ${$(element).text()}\n\n`;
          break;
        case 'h3':
          markdown += `### ${$(element).text()}\n\n`;
          break;
        case 'p':
          let paraText = $(element).html() || '';
          // Convert strong tags
          paraText = paraText.replace(/<strong>(.+?)<\/strong>/g, '**$1**');
          // Convert em tags
          paraText = paraText.replace(/<em>(.+?)<\/em>/g, '*$1*');
          // Convert links
          paraText = paraText.replace(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '[$2]($1)');
          // Convert sup tags
          paraText = paraText.replace(/<sup>(.+?)<\/sup>/g, '$1');
          // Remove remaining HTML tags
          paraText = paraText.replace(/<[^>]+>/g, '');
          markdown += `${paraText}\n\n`;
          break;
        case 'ul':
          $(element).find('li').each((i, li) => {
            markdown += `* ${$(li).text()}\n`;
          });
          markdown += '\n';
          break;
        case 'ol':
          $(element).find('li').each((i, li) => {
            markdown += `${i + 1}. ${$(li).text()}\n`;
          });
          markdown += '\n';
          break;
      }
    });
    
    return markdown.trim();
  }
}