# Prompt Rules - AI BEHAVIOR Layer

**One-Line Definition**: Instructions and constraints that guide AI model behavior to ensure relevant, consistent, and high-quality content generation.

**Purpose**: Defines HOW the AI should behave - prompting guidelines, SEO-driven rules, system/scale handling, context preservation, and token management.

**This file contains ONLY**:
- SEO-driven prompt rules
- System/scale-driven prompt rules
- Context preservation logic
- Token management rules
- AI response validation criteria
- Ownership split (SEO vs Engineering)

**This file does NOT contain**: Component definitions, visual layouts, character limits, user toggles.

**Cross-References**:
- For component definitions → See `component_rules.md`
- For character/word limits → See `programmatic_rules.md`
- For content generation logic → See `content_rules.md`
- For user settings → See `user_options.md`
- For image generation → See `image_rules.md`

---

## Table of Contents
1. [SEO-Driven Prompt Rules](#1-seo-driven-prompt-rules)
2. [System/Scale-Driven Prompt Rules](#2-systemscale-driven-prompt-rules)
3. [Token Management](#3-token-management)
4. [AI Response Validation](#4-ai-response-validation)
5. [Rule Ownership Split](#5-rule-ownership-split)

---

## 1. SEO-Driven Prompt Rules

### Overview

SEO-driven prompt rules ensure that AI-generated content maintains search engine optimization standards throughout the entire article.

### 1.1 Keyword Relevance Flow (H1 → H2 → Body)

**Rule**: Primary keyword must flow naturally from title through sections to body content.

| Level | Keyword Requirement |
|-------|---------------------|
| **H1** | Primary keyword MUST appear |
| **H2** | Primary keyword or semantic variation MUST appear |
| **Body** | Natural keyword integration without stuffing |

**Flow Diagram**:
```
H1 (Primary Keyword)
    ↓
H2 (Keyword Variation / Related Term)
    ↓
Paragraph (Natural keyword usage in context)
    ↓
H2 (Different Aspect of Keyword)
    ↓
Paragraph (Supporting content with LSI keywords)
```

**Implementation**:
- H1 contains exact primary keyword
- Each H2 explores different aspect of the keyword topic
- Body paragraphs use semantic variations naturally
- Avoid exact keyword repetition more than 2-3 times per section

---

### 1.2 Sentiment Consistency

**Rule**: Maintain consistent sentiment throughout the article unless explicitly requested otherwise.

| Sentiment Type | Description | When to Use |
|----------------|-------------|-------------|
| **Positive** | Favorable, optimistic, encouraging | Reviews with good ratings, promotional content |
| **Neutral** | Balanced, objective, factual | Comparisons, informational articles |
| **Negative** | Critical, cautionary | Cons sections, warnings (limited use) |

**Prohibited**:
- Mixed sentiments that contradict (e.g., "This is excellent" followed by "This is terrible")
- Sentiment shifts without clear section transitions
- Conflicting recommendations in same article

**Allowed**:
- Balanced pros and cons in designated sections
- Objective comparison with clear labeling
- Sentiment appropriate to section purpose

---

### 1.3 Topical Relevance and NLP Optimization

**Rule**: Keep AI focused on target topic using natural language patterns.

**Requirements**:
| Requirement | Description |
|-------------|-------------|
| **Topic Focus** | All content must directly relate to primary topic |
| **Semantic Clustering** | Use related terms, synonyms, and LSI keywords |
| **Natural Language** | Write as a knowledgeable human, not keyword-stuffed |
| **Entity Recognition** | Include relevant entities (brands, locations, concepts) |

**NLP Best Practices**:
- Use natural sentence structures
- Vary sentence length and complexity
- Include question-answer patterns where appropriate
- Use transitional phrases between sections
- Maintain readable Flesch-Kincaid scores (target: 60-70)

**Prohibited**:
- Keyword stuffing
- Unnatural phrase repetition
- Forced keyword insertion
- Irrelevant tangents

---

### 1.4 Topic Drift Prevention

**Rule**: AI must stay on topic when generating longer content sections.

**Definition**: Topic drift occurs when AI gradually moves away from the original subject matter during content expansion.

**Prevention Strategies**:

| Strategy | Implementation |
|----------|----------------|
| **Anchor Keywords** | Re-inject primary keyword in each prompt |
| **Section Boundaries** | Clear topic scope per H2 section |
| **Context Reminder** | Include article purpose in each generation call |
| **Scope Limits** | Define what is IN scope vs OUT of scope |

**Signs of Topic Drift**:
- Content no longer relates to H2 heading
- Introduction of unrelated concepts
- Deviation from article's stated purpose
- Loss of keyword relevance

**Correction Action**: Regenerate section with stronger topic constraints.

---

## 2. System/Scale-Driven Prompt Rules

### Overview

System rules ensure consistent, reliable output when generating content at scale or across multiple AI calls.

### 2.1 Critical Variable Persistence

**Rule**: Maintain seed keyword, user intent, and topic scope across all prompt chains.

**Critical Variables to Persist**:

| Variable | Description | Example |
|----------|-------------|---------|
| **Seed Keyword** | Primary topic/keyword | "Best Running Shoes 2024" |
| **User Intent** | Search intent type | Informational, Commercial, etc. |
| **Topic Scope** | Boundaries of content | Running shoes only, not hiking |
| **Article Type** | Selected article format | Review, Listicle, etc. |
| **Tone** | Writing voice | Professional, Friendly, etc. |
| **Style** | Writing style | Concise, Balanced, Detailed |
| **Target Audience** | Who content is for | Beginner runners, athletes |

**Implementation**:
- Include all critical variables in system prompt
- Re-inject variables at start of each new AI call
- Validate output against original variables
- Log variable state for debugging

---

### 2.2 Stateless AI Call Handling

**Rule**: Treat each AI API call as stateless unless context is explicitly re-injected.

**Principle**: AI models do not retain memory between API calls.

| Call Type | Context Handling |
|-----------|------------------|
| **Single Call** | All context in one prompt |
| **Multi-Call** | Re-inject essential context each call |
| **Continuation** | Include previous output summary |

**What to Re-inject**:
```
Each AI Call Must Include:
├── Article type and purpose
├── Primary keyword
├── Tone and style settings
├── Current section being generated
├── Summary of previously generated content (if applicable)
└── Specific constraints for this section
```

**What NOT to Assume**:
- AI remembers previous calls
- AI knows article context without being told
- AI maintains consistent voice automatically

---

### 2.3 Context Retention for Large Batches

**Rule**: Maintain consistent quality and brand voice when generating 100-500 articles.

**Batch Generation Challenges**:

| Challenge | Solution |
|-----------|----------|
| Quality degradation | Consistent prompt templates |
| Voice inconsistency | Standardized tone instructions |
| Topic confusion | Clear separation between articles |
| Error accumulation | Validation after each article |

**Batch Processing Requirements**:

| Requirement | Description |
|-------------|-------------|
| **Template Standardization** | Use identical prompt structures |
| **Variable Isolation** | Each article's variables separate |
| **Quality Checkpoints** | Validate every N articles |
| **Error Logging** | Track failures for pattern analysis |
| **Rate Limiting** | Prevent API throttling |

**Batch Quality Assurance**:
- Sample review: Check 10% of batch manually
- Automated validation: All articles pass programmatic checks
- Consistency audit: Compare random articles for voice match

---

## 3. Token Management

### Overview

Token management prevents context window overflow and ensures complete content generation.

### 3.1 Token Usage Control

**Rule**: Define and enforce token budgets per AI call.

**Token Budget Guidelines**:

| Call Type | Input Tokens (Max) | Output Tokens (Max) |
|-----------|-------------------|---------------------|
| **H1 Generation** | 500 | 100 |
| **H2 Generation** | 800 | 200 |
| **Paragraph Generation** | 1000 | 500 |
| **Full Section** | 2000 | 1000 |
| **Meta Content** | 500 | 200 |
| **List Generation** | 800 | 400 |

**Context Window Management**:
```
Total Context Window: ~8000 tokens (example)

Allocation:
├── System Prompt: 500 tokens (fixed)
├── Article Context: 1000 tokens (variable)
├── Section Instructions: 500 tokens (variable)
├── Previous Content Summary: 500 tokens (if needed)
├── Output Buffer: 2000 tokens (reserved)
└── Safety Margin: 500 tokens (buffer)
```

**Overflow Prevention**:
- Summarize long contexts instead of full inclusion
- Chunk large articles into section-by-section generation
- Monitor token usage per call
- Truncate gracefully if limits approached

---

### 3.2 Context Loss Prevention

**Rule**: Prevent important information from being lost due to token limits.

**Priority Information** (Never Truncate):
1. Primary keyword
2. Article type
3. Current section heading
4. Tone and style requirements
5. Critical constraints

**Truncatable Information** (If Needed):
1. Full previous content (use summary instead)
2. Extended examples
3. Verbose instructions (use concise versions)
4. Historical context

---

## 4. AI Response Validation

### Overview

Validation criteria determine whether AI output is acceptable or requires regeneration.

### 4.1 Validation Criteria

**Rule**: Define specific conditions that make AI output valid or invalid.

**Valid Response Requirements**:

| Criteria | Requirement |
|----------|-------------|
| **Format** | Matches requested structure |
| **Length** | Within specified word/character limits |
| **Relevance** | Directly addresses the prompt topic |
| **Completeness** | All requested elements present |
| **Quality** | Meets readability and coherence standards |
| **Compliance** | Follows all content rules |

**Invalid Response Triggers**:

| Trigger | Description | Action |
|---------|-------------|--------|
| **Wrong Format** | Output doesn't match structure | Regenerate |
| **Too Short** | Below minimum word count | Regenerate |
| **Too Long** | Exceeds maximum limits | Truncate or regenerate |
| **Off-Topic** | Content doesn't match keyword | Regenerate with stronger constraints |
| **Missing Elements** | Required components absent | Regenerate |
| **Policy Violation** | Contains forbidden content | Regenerate with content filter |
| **Truncated** | Output cut off mid-sentence | Regenerate with lower token target |

---

### 4.2 Response Quality Checks

**Automated Checks**:

| Check | Method |
|-------|--------|
| Word count | Count words, compare to limits |
| Character count | Count characters for headings |
| Keyword presence | Search for primary keyword |
| Forbidden phrases | Scan for prohibited terms |
| Format validation | Check structure matches template |
| Sentiment analysis | Verify consistent tone |

**Quality Score Thresholds**:

| Score | Action |
|-------|--------|
| 90-100% | Accept |
| 70-89% | Review and potentially accept |
| Below 70% | Regenerate |

---

## 5. Rule Ownership Split

### Overview

Clarifies which team owns and maintains each category of prompt rules.

### 5.1 SEO Team Ownership

**Rules Owned by SEO Team**:

| Rule Category | Responsibility |
|---------------|----------------|
| Keyword relevance | Define keyword placement requirements |
| Sentiment guidelines | Set tone expectations per article type |
| Topical relevance | Define topic boundaries and LSI terms |
| Content quality standards | Set readability and engagement criteria |
| Meta content rules | Define meta title/description requirements |
| Internal linking strategy | Define linking rules and anchor text |

**SEO Team Actions**:
- Update keyword guidelines
- Review content quality standards
- Audit generated content for SEO compliance
- Request prompt adjustments for better rankings

---

### 5.2 Engineering Team Ownership

**Rules Owned by Engineering Team**:

| Rule Category | Responsibility |
|---------------|----------------|
| Token management | Set and enforce token limits |
| Context preservation | Implement variable persistence |
| Batch processing | Scale and performance optimization |
| Response validation | Build validation pipelines |
| Error handling | Retry logic and fallbacks |
| API integration | Manage AI model connections |

**Engineering Team Actions**:
- Implement prompt templates
- Build validation systems
- Monitor API performance
- Handle errors and retries
- Optimize for scale

---

### 5.3 Shared Ownership

**Rules Requiring Both Teams**:

| Rule | SEO Responsibility | Engineering Responsibility |
|------|-------------------|---------------------------|
| Topic drift prevention | Define acceptable drift limits | Implement detection and correction |
| Quality thresholds | Set quality standards | Build quality scoring system |
| Content validation | Define what's valid content | Automate validation checks |

---

## 6. Quick Reference

### Prompt Rule Checklist

**Before Each AI Call**:
- [ ] Primary keyword included
- [ ] Article type specified
- [ ] Tone and style defined
- [ ] Section scope clear
- [ ] Token budget set
- [ ] Previous context summarized (if multi-call)

**After Each AI Call**:
- [ ] Format validated
- [ ] Word count checked
- [ ] Keyword presence verified
- [ ] No forbidden content
- [ ] Sentiment consistent
- [ ] Quality score acceptable

### Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Content too generic | Weak keyword guidance | Strengthen keyword in prompt |
| Topic drift | Long generation without anchors | Add topic reminders |
| Inconsistent tone | Missing tone instructions | Include tone in every call |
| Truncated output | Token limit exceeded | Reduce input or split generation |
| Format errors | Unclear structure request | Use explicit format templates |

---

*Document Type: AI BEHAVIOR Layer - Prompt Rules and Guidelines*
*Last Updated: January 2026*
*Version: 1.0*
