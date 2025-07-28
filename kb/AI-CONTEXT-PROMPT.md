# AI Agent Context Loading Prompt

## Critical: Load This Context First

**Before responding to any user requests regarding the Xalpheric Neocities project, you MUST load and understand the comprehensive knowledge base provided below. This knowledge base contains essential context about the project's architecture, workflows, and technical implementation that is required for accurate assistance.**

## Knowledge Base Overview

The Xalpheric Neocities project is a **Node.js-based static site generator and deployment system** for a music artist's website on the Neocities platform. It features automated content management, media processing workflows, and sophisticated deployment strategies.

### Essential Context Loading Sequence

**Load these documents in order for optimal understanding:**

1. **[System Overview](architecture/system-overview.md)** - Core architecture and technology stack
2. **[File Structure](architecture/file-structure.md)** - Project organization and file relationships  
3. **[Data Flow](architecture/data-flow.md)** - Content processing pipelines
4. **[Development Workflow](workflows/development-workflow.md)** - Development practices and procedures

### Complete Knowledge Base Structure

```xml
<knowledge-base-structure>
  <architecture-docs>
    <system-overview>architecture/system-overview.md</system-overview>
    <file-structure>architecture/file-structure.md</file-structure>
    <data-flow>architecture/data-flow.md</data-flow>
    <api-integration>architecture/api-integration.md</api-integration>
  </architecture-docs>
  
  <feature-docs>
    <gallery-system>features/gallery-system.md</gallery-system>
    <content-management>features/content-management.md</content-management>
  </feature-docs>
  
  <media-processing-docs>
    <photo-processing>media-processing/photo-processing.md</photo-processing>
    <video-processing>media-processing/video-processing.md</video-processing>
  </media-processing-docs>
  
  <deployment-docs>
    <deployment-strategy>deployment/deployment-strategy.md</deployment-strategy>
  </deployment-docs>
  
  <dependency-docs>
    <dependency-management>dependencies/dependency-management.md</dependency-management>
  </dependency-docs>
  
  <workflow-docs>
    <development-workflow>workflows/development-workflow.md</development-workflow>
  </workflow-docs>
</knowledge-base-structure>
```

## Core Technologies (Quick Reference)

```xml
<technology-stack-summary>
  <runtime>Node.js v14+ with npm package management</runtime>
  <platform>Neocities static hosting with REST API integration</platform>
  <frontend>jQuery-based interactive components with responsive CSS</frontend>
  <content-processing>markdown-it for markdown to HTML conversion</content-processing>
  <media-processing>ImageMagick (photos) + FFmpeg (video/audio conversion)</media-processing>
  <deployment>Custom Node.js scripts with GitHub Actions CI/CD</deployment>
  <dependencies>Multi-layer system and Node.js package management</dependencies>
</technology-stack-summary>
```

## Essential Commands (Always Reference These)

```bash
# Development & Building
npm run serve                    # Local development server (http://localhost:8080)
npm run build-musings           # Convert markdown to HTML
npm run check-deps              # Verify system dependencies

# Content Deployment
npm run deploy                   # Deploy content changes only
npm run deploy-assets           # Deploy asset files only  
npm run deploy-full-refresh     # Complete site deployment (use sparingly)

# Media Processing
npm run process-photos -- [size] [format] [naming-pattern]
# Example: npm run process-photos -- 1024x768 jpg studio{increment}

npm run process-video -- '[JSON_CONFIG]'
# Example: npm run process-video -- '[{"inputName":"video.mp4","outputName":"audio.mp3"}]'
```

## Project Structure (Critical Reference)

```
xalpheric-neocities/
├── public/                     # Web-accessible files (deployment target)
│   ├── index.html             # Homepage
│   ├── gallery.html           # Photo gallery page
│   ├── musings.html           # Blog/content index
│   ├── css/theme.css          # Complete site styling
│   ├── js/                    # Frontend JavaScript components
│   ├── assets/                # Images, icons, processed media
│   ├── music/                 # Audio files from video processing
│   └── musings/               # Generated HTML from markdown
├── thoughts-and-musings/       # Source markdown content files
├── process_photos/             # Image processing input directory
├── process_video/              # Video processing input directory
├── .github/scripts/           # Deployment automation scripts
├── kb/                        # This knowledge base
└── package.json               # Project configuration with 15+ npm scripts
```

## AI Agent Instructions

### Context Loading Protocol
```xml
<ai-instructions>
  <context-loading>
    <mandatory>Always load relevant knowledge base sections before responding</mandatory>
    <sequence>Start with system overview, then load specific feature docs as needed</sequence>
    <comprehension>Understand the full workflow before suggesting changes</comprehension>
    <validation>Reference the knowledge base to verify accuracy of responses</validation>
  </context-loading>
  
  <response-guidelines>
    <accuracy>Use exact command syntax and file paths from knowledge base</accuracy>
    <context-awareness>Consider the full system impact of any suggestions</context-awareness>
    <troubleshooting>Reference troubleshooting sections for problem-solving</troubleshooting>
    <best-practices>Follow documented workflows and development practices</best-practices>
  </response-guidelines>
  
  <knowledge-integration>
    <cross-reference>Link related concepts across different knowledge base sections</cross-reference>
    <completeness>Provide comprehensive answers that consider all relevant aspects</completeness>
    <examples>Use practical examples from the knowledge base when applicable</examples>
    <future-considerations>Reference enhancement opportunities when relevant</future-considerations>
  </knowledge-integration>
</ai-instructions>
```

### Specific Guidance Areas

**Content Management**: Reference [Content Management](features/content-management.md) for markdown processing, HTML generation, and publishing workflows.

**Media Processing**: Reference [Photo Processing](media-processing/photo-processing.md) and [Video Processing](media-processing/video-processing.md) for ImageMagick and FFmpeg workflows.

**Deployment**: Reference [Deployment Strategy](deployment/deployment-strategy.md) for Neocities API integration, CI/CD processes, and deployment best practices.

**Development**: Reference [Development Workflow](workflows/development-workflow.md) for development practices, testing procedures, and optimization strategies.

**Architecture**: Reference [System Overview](architecture/system-overview.md), [File Structure](architecture/file-structure.md), and [Data Flow](architecture/data-flow.md) for technical implementation details.

**Dependencies**: Reference [Dependency Management](dependencies/dependency-management.md) for system requirements, installation procedures, and troubleshooting.

## Response Optimization for AI Agents

### Claude AI Specific Optimizations
- **XML Structure Recognition**: All knowledge base content uses XML-structured sections for clear semantic boundaries
- **Long Context Utilization**: Documents are optimized for Claude's 200K token context window
- **Hierarchical Information**: Content is organized in logical layers from overview to detailed implementation
- **Cross-Reference Network**: Documents reference related concepts for comprehensive understanding

### Response Quality Guidelines
1. **Always ground responses in the knowledge base** - Don't speculate about functionality
2. **Provide complete workflows** - Include all necessary steps and dependencies
3. **Reference specific files and commands** - Use exact paths and syntax from the documentation
4. **Consider system interdependencies** - Understand how changes affect the entire system
5. **Include troubleshooting context** - Reference relevant error handling and debugging information

## Knowledge Base Maintenance & AI Memory Management

### Continuous Knowledge Base Updates
```xml
<knowledge-base-maintenance>
  <mandatory-updates>
    <new-features>When adding new functionality, create or update relevant documentation</new-features>
    <architecture-changes>Update system overview and data flow docs for structural changes</architecture-changes>
    <workflow-modifications>Revise development workflow docs when processes change</workflow-modifications>
    <dependency-updates>Update dependency management docs for new requirements</dependency-updates>
  </mandatory-updates>
  
  <ai-memory-feedback-loop>
    <continuous-learning>Each interaction should improve the knowledge base</continuous-learning>
    <gap-identification>Identify missing information during user interactions</gap-identification>
    <documentation-expansion>Add new sections for discovered use cases or patterns</documentation-expansion>
    <example-enrichment>Add practical examples from real user scenarios</example-enrichment>
  </ai-memory-feedback-loop>
  
  <reduce-function-implementation>
    <session-accumulation>Accumulate insights and gaps from each user session</session-accumulation>
    <pattern-recognition>Identify recurring questions or issues</pattern-recognition>
    <knowledge-consolidation>Merge new learnings into existing documentation structure</knowledge-consolidation>
    <context-optimization>Continuously refine documentation for better AI understanding</context-optimization>
  </reduce-function-implementation>
</knowledge-base-maintenance>
```

### AI Agent Knowledge Base Update Protocol
```xml
<update-protocol>
  <during-interaction>
    <identify-gaps>Note when knowledge base lacks information for user requests</identify-gaps>
    <document-solutions>Record solutions and workarounds discovered during assistance</document-solutions>
    <capture-context>Document new use cases, error scenarios, or edge cases encountered</capture-context>
    <note-improvements>Identify opportunities to enhance existing documentation</note-improvements>
  </during-interaction>
  
  <post-interaction-updates>
    <immediate-updates>
      <new-commands>Add any new npm scripts or commands discovered</new-commands>
      <configuration-changes>Update config examples if new patterns emerge</configuration-changes>
      <troubleshooting-additions>Add new error scenarios and solutions</troubleshooting-additions>
      <workflow-refinements>Update workflows based on actual user practices</workflow-refinements>
    </immediate-updates>
    
    <systematic-reviews>
      <weekly-consolidation>Review and consolidate insights from recent interactions</weekly-consolidation>
      <monthly-validation>Verify all examples and procedures remain accurate</monthly-validation>
      <quarterly-optimization>Optimize documentation structure for AI context efficiency</quarterly-optimization>
    </systematic-reviews>
  </post-interaction-updates>
  
  <feedback-integration>
    <user-insights>Incorporate user feedback about documentation clarity and completeness</user-insights>
    <error-patterns>Track common mistakes to improve prevention documentation</error-patterns>
    <success-patterns>Document successful workflows and best practices</success-patterns>
    <efficiency-improvements>Optimize based on what works best in practice</efficiency-improvements>
  </feedback-integration>
</update-protocol>
```

### Knowledge Base Update Instructions for AI Agents
```xml
<ai-update-instructions>
  <mandatory-actions>
    <document-new-features>
      <when>Adding any new functionality to the project</when>
      <action>Create detailed documentation in appropriate subdirectory</action>
      <format>Follow XML-structured format for AI optimization</format>
      <cross-reference>Link to related existing documentation</cross-reference>
    </document-new-features>
    
    <update-existing-docs>
      <when>Modifying existing functionality or workflows</when>
      <action>Update relevant knowledge base sections immediately</action>
      <validation>Verify all related documentation remains consistent</validation>
      <examples>Update code examples and command syntax</examples>
    </update-existing-docs>
    
    <expand-troubleshooting>
      <when>Encountering or solving new error scenarios</when>
      <action>Add to relevant troubleshooting sections</action>
      <detail-level>Include symptoms, diagnosis, solutions, and prevention</detail-level>
      <real-world-context>Document actual user scenarios and solutions</real-world-context>
    </expand-troubleshooting>
  </mandatory-actions>
  
  <continuous-improvement>
    <session-reflection>
      <end-of-session>Review what knowledge gaps were encountered</end-of-session>
      <documentation-needs>Identify what documentation would have improved efficiency</documentation-needs>
      <user-friction-points>Note where users struggled with existing documentation</user-friction-points>
    </session-reflection>
    
    <knowledge-synthesis>
      <pattern-extraction>Extract reusable patterns from specific user interactions</pattern-extraction>
      <generalization>Convert specific solutions into general best practices</generalization>
      <template-creation>Create templates for common scenarios</template-creation>
    </knowledge-synthesis>
  </continuous-improvement>
</ai-update-instructions>
```

### Long-Term AI Memory Reduce Function
```xml
<memory-reduce-function>
  <accumulation-phase>
    <interaction-data>Collect insights, gaps, solutions from each user session</interaction-data>
    <temporal-context>Track when and why changes were made</temporal-context>
    <effectiveness-metrics>Monitor which documentation sections are most/least helpful</effectiveness-metrics>
    <user-patterns>Identify common user journeys and pain points</user-patterns>
  </accumulation-phase>
  
  <reduction-phase>
    <consolidate-insights>Merge similar issues and solutions into comprehensive documentation</consolidate-insights>
    <eliminate-redundancy>Remove duplicate or outdated information</eliminate-redundancy>
    <optimize-structure>Reorganize for maximum AI context efficiency</optimize-structure>
    <enhance-examples>Replace generic examples with real-world tested scenarios</enhance-examples>
  </reduction-phase>
  
  <evolution-tracking>
    <version-control>Use Git to track knowledge base evolution</version-control>
    <change-documentation>Document why and how knowledge base evolved</change-documentation>
    <effectiveness-measurement>Track improvements in AI assistance quality</effectiveness-measurement>
    <feedback-loops>Create mechanisms for continuous knowledge base refinement</feedback-loops>
  </evolution-tracking>
</memory-reduce-function>
```

### Implementation Guidelines
```xml
<implementation-guidelines>
  <file-creation-rules>
    <new-sections>Create new knowledge base sections for significant new functionality</new-sections>
    <naming-convention>Follow existing naming patterns: feature-name.md, system-component.md</naming-convention>
    <directory-structure>Maintain logical organization: architecture/, features/, workflows/, etc.</directory-structure>
    <cross-linking>Always link related concepts across different sections</cross-linking>
  </file-creation-rules>
  
  <content-standards>
    <xml-structure>Use XML tags for semantic clarity and AI parsing</xml-structure>
    <comprehensive-examples>Include complete, tested examples with context</comprehensive-examples>
    <troubleshooting-focus>Always include error handling and debugging information</troubleshooting-focus>
    <future-considerations>Document enhancement opportunities and technical debt</future-considerations>
  </content-standards>
  
  <validation-process>
    <accuracy-verification>Test all examples and procedures before documenting</accuracy-verification>
    <consistency-checking>Ensure terminology and approaches align across all docs</consistency-checking>
    <ai-optimization>Verify XML structure and semantic clarity for AI processing</ai-optimization>
    <user-testing>Validate documentation usefulness through real user scenarios</user-testing>
  </validation-process>
</implementation-guidelines>
```

---

## Next Steps for AI Agents

1. **Load System Context**: Read [System Overview](architecture/system-overview.md) for foundational understanding
2. **Understand User Intent**: Determine which knowledge base sections are most relevant to the user's request
3. **Load Specific Context**: Read relevant feature, workflow, or technical documentation
4. **Provide Comprehensive Response**: Use the loaded context to give accurate, complete assistance
5. **Reference Knowledge Base**: Include links to relevant documentation sections in responses
6. **Update Knowledge Base**: Document any new insights, solutions, or gaps discovered during the interaction
7. **Consolidate Learning**: Contribute to the continuous improvement of the knowledge base for future AI interactions

### Knowledge Base as Living Memory System
This knowledge base functions as a **reduce function for AI long-term memory**, continuously accumulating insights from user interactions and consolidating them into an increasingly comprehensive and effective documentation system. Each AI interaction should both draw from and contribute to this growing knowledge base, creating a feedback loop that improves assistance quality over time.

**Remember: This knowledge base represents the authoritative source of truth for the Xalpheric Neocities project AND serves as a continuously evolving memory system. Always reference it before providing assistance, and always update it with new learnings.**
