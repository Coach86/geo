# Removed AEO Rules

This document lists all the AEO rules that were removed from the system.

## Technical Rules (2 rules removed)
- Page Speed & Core Web Vitals (page-speed.rule.ts)
- Internal Linking (internal-linking.rule.ts)

## Authority Rules (13 rules removed)
- Community Engagement & Discussions (community-engagement.rule.ts)
- Cross-Platform Social Proof Strategy (cross-platform-social.rule.ts)
- Engagement with Forum Community (Reddit & Quora) (forum-engagement.rule.ts)
- Expert Reviews & Comparison Sites (expert-reviews.rule.ts)
- External User Reviews (external-user-reviews.rule.ts)
- Industry Recognition & Awards (industry-recognition.rule.ts)
- Influencer Community Engagement (influencer-community.rule.ts)
- LinkedIn Thought Leadership (linkedin-thought-leadership.rule.ts)
- Podcasting Authority (podcasting.rule.ts)
- Social Media Presence (social-media-presence.rule.ts)
- YouTube Authority Building (youtube-authority.rule.ts)
- User Reviews Integration (user-reviews-integration.rule.ts)

## Monitoring KPI Rules (3 rules removed - entire category)
- Brand Citations (brand-citations.rule.ts)
- Brand Mentions (brand-mentions.rule.ts)
- Brand Sentiment (brand-sentiment.rule.ts)

## Total Rules Removed: 18

### Files Updated:
1. `/backend/src/modules/crawler/services/aeo-rule-registry.service.ts` - Removed imports and registrations
2. `/backend/src/modules/crawler/rules/aeo/authority/index.ts` - Removed exports
3. `/backend/src/modules/crawler/rules/aeo/technical/index.ts` - Removed exports
4. `/backend/src/modules/crawler/rules/aeo/monitoring-kpi/index.ts` - Removed all exports (category empty)

### Note:
The actual rule files are still in the codebase but are no longer imported, exported, or registered. They can be physically deleted if needed.