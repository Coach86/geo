import { Injectable } from '@nestjs/common';
import { BaseStructureRule } from './base-structure.rule';
import { RuleContext, RuleResult } from '../interfaces/rule.interface';

@Injectable()
export class ListsTablesRule extends BaseStructureRule {
  id = 'structure-lists-tables';
  name = 'Lists and Tables';
  description = 'Evaluates presence and quality of lists and tables for better content structure';
  applicability = { scope: 'all' as const };
  priority = 8;
  weight = 0.15; // 15% of structure score

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { pageSignals } = context;
    const listCount = pageSignals.structure.listCount || 0;
    
    // Extract table information from HTML
    const tableInfo = this.extractTableInfo(context.html);
    const tableCount = tableInfo.count;
    
    const issues = [];
    const evidence = [];
    let score = 0;

    // Calculate combined score based on lists and tables
    const totalStructuredElements = listCount + tableCount;

    if (totalStructuredElements === 0) {
      score = 0; // No structured elements = failure
      issues.push(this.generateIssue(
        'medium',
        'No lists or tables found',
        'Consider using lists or tables to break up content and improve readability'
      ));
      evidence.push('No lists or tables detected - content may be harder to scan');
    } else if (totalStructuredElements >= 5) {
      score = 100; // Excellent use of structured elements
      evidence.push(`Excellent content structure: ${listCount} lists and ${tableCount} tables found`);
      
      // Add specific evidence about lists
      if (listCount > 0) {
        const listTypes = this.extractListTypes(context.html);
        evidence.push(`Lists found: ${listTypes.ul} unordered, ${listTypes.ol} ordered lists`);
        
        // Show sample list items (first 3)
        const sampleItems = this.extractSampleListItems(context.html, 3);
        if (sampleItems.length > 0) {
          evidence.push(`Sample list items: ${sampleItems.map(item => `"${item}"`).join(', ')}`);
        }
      }
      
      // Add specific evidence about tables
      if (tableCount > 0) {
        evidence.push(`Tables found: ${tableInfo.details}`);
        if (tableInfo.headers.length > 0) {
          evidence.push(`Table headers: ${tableInfo.headers.slice(0, 5).join(', ')}${tableInfo.headers.length > 5 ? '...' : ''}`);
        }
      }
    } else if (totalStructuredElements >= 3) {
      score = 80; // Good use of structured elements
      evidence.push(`Good content structure: ${listCount} lists and ${tableCount} tables found`);
      
      // Add specific details
      if (listCount > 0) {
        const listTypes = this.extractListTypes(context.html);
        evidence.push(`Lists: ${listTypes.ul} unordered, ${listTypes.ol} ordered`);
      }
      if (tableCount > 0) {
        evidence.push(`Tables: ${tableInfo.details}`);
      }
      
      issues.push(this.generateIssue(
        'low',
        'Consider adding more structured elements',
        'Additional lists or tables could further improve content scannability'
      ));
    } else {
      score = 50; // Limited structured elements
      evidence.push(`Limited structured content: ${listCount} lists and ${tableCount} tables found`);
      
      if (listCount > 0) {
        evidence.push(`${listCount} list${listCount > 1 ? 's' : ''} found`);
      }
      if (tableCount > 0) {
        evidence.push(`${tableCount} table${tableCount > 1 ? 's' : ''} found`);
      }
      
      issues.push(this.generateIssue(
        'medium',
        'Few structured elements found',
        'Add more lists or tables to break up content and improve readability'
      ));
    }

    // Check for nested lists (good for complex information)
    const hasNestedLists = this.checkForNestedLists(context.html);
    if (hasNestedLists && score >= 50) {
      evidence.push('Nested lists detected - good for organizing complex information');
    }

    // Check for definition lists (good for glossaries, FAQs)
    const dlCount = this.countDefinitionLists(context.html);
    if (dlCount > 0) {
      evidence.push(`${dlCount} definition list${dlCount > 1 ? 's' : ''} found - good for terms and definitions`);
      if (score < 100) {
        score = Math.min(100, score + 10); // Bonus for definition lists
      }
    }

    return this.createResult(
      score,
      100,
      evidence,
      { 
        listCount, 
        tableCount,
        totalStructuredElements,
        hasNestedLists,
        definitionListCount: dlCount,
        tableHeaders: tableInfo.headers
      },
      issues
    );
  }

  private extractTableInfo(html: string): { count: number; details: string; headers: string[] } {
    try {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      const tables = document.querySelectorAll('table');
      const headers: string[] = [];
      
      tables.forEach((table: any) => {
        // Extract headers from th elements
        const ths = table.querySelectorAll('th');
        ths.forEach((th: any) => {
          const text = th.textContent?.trim();
          if (text && text.length > 0 && text.length < 50) {
            headers.push(text);
          }
        });
        
        // Also check first row for headers if no th elements
        if (headers.length === 0) {
          const firstRow = table.querySelector('tr');
          if (firstRow) {
            const cells = firstRow.querySelectorAll('td');
            cells.forEach((cell: any) => {
              const text = cell.textContent?.trim();
              if (text && text.length > 0 && text.length < 50) {
                headers.push(text);
              }
            });
          }
        }
      });
      
      const details = tables.length === 1 
        ? '1 table with structured data'
        : `${tables.length} tables with structured data`;
      
      return {
        count: tables.length,
        details,
        headers: Array.from(new Set(headers)) // Remove duplicates
      };
    } catch (error) {
      return { count: 0, details: 'Unable to analyze tables', headers: [] };
    }
  }

  private extractListTypes(html: string): { ul: number; ol: number } {
    try {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      return {
        ul: document.querySelectorAll('ul').length,
        ol: document.querySelectorAll('ol').length
      };
    } catch (error) {
      return { ul: 0, ol: 0 };
    }
  }

  private extractSampleListItems(html: string, limit: number): string[] {
    try {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      const items: string[] = [];
      const listItems = document.querySelectorAll('li');
      
      for (let i = 0; i < Math.min(listItems.length, limit); i++) {
        const text = listItems[i].textContent?.trim();
        if (text && text.length > 0 && text.length < 100) {
          // Clean up the text and remove nested list items
          const cleanText = text.split('\n')[0].trim();
          if (cleanText) {
            items.push(cleanText);
          }
        }
      }
      
      return items;
    } catch (error) {
      return [];
    }
  }

  private checkForNestedLists(html: string): boolean {
    try {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      // Check for lists within lists
      const nestedUl = document.querySelectorAll('ul ul, ul ol').length > 0;
      const nestedOl = document.querySelectorAll('ol ul, ol ol').length > 0;
      
      return nestedUl || nestedOl;
    } catch (error) {
      return false;
    }
  }

  private countDefinitionLists(html: string): number {
    try {
      const { JSDOM } = require('jsdom');
      const dom = new JSDOM(html);
      const document = dom.window.document;
      
      return document.querySelectorAll('dl').length;
    } catch (error) {
      return 0;
    }
  }
}