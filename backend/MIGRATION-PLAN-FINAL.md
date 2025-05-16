# Final Backend Architecture Migration Plan

This document outlines a pragmatic migration plan for transitioning to a domain-driven design while preserving NestJS's module structure and organizing shared infrastructure.

## Target Architecture

The architecture will combine module-based organization with shared infrastructure:

```
/src
  /modules                     # NestJS feature modules
    /llm
      /domain                  # Domain models and business logic
        /models                # Core domain entities and value objects 
        /interfaces            # Domain interfaces
        /events                # Domain events
      /application             # Application services and use cases
        /services              # Application services
        /dto                   # DTOs for application services
        /mappers               # Mappers between domain and DTOs
      /infrastructure          # Module-specific implementations
        /adapters              # Module-specific adapters
      /interface               # Controllers and presentation
        /controllers           # API Controllers
        /dto                   # Request/Response DTOs
      llm.module.ts            # Module definition
    /identity-card
      ...
    /batch
      ...
    /prompt
      ...
    /report
      ...
    /user
      ...
      
  /infrastructure              # Shared infrastructure concerns
    /database                  # Database configuration and shared repositories
    /messaging                 # Message broker configuration
    /cache                     # Caching infrastructure
    /storage                   # File storage services
    /http                      # HTTP client configurations
    /email                     # Email service
    
  /shared                      # Cross-cutting concerns
    /domain                    # Shared domain primitives
      /value-objects           # Common value objects
      /entities                # Base entity classes
      /events                  # Event infrastructure
    /utils                     # Shared utilities
    /config                    # Application configuration
    /logging                   # Logging infrastructure
    /auth                      # Authentication infrastructure
    /errors                    # Error handling
    
  app.module.ts                # Main application module
  main.ts                      # Application entry point
```

## Module Example Structure

Here's a detailed example of the LLM module structure:

```
/modules/llm
  /domain
    /models
      llm-provider.enum.ts
      llm-response.model.ts
      source-citation.value-object.ts
      tool-use-info.value-object.ts
    /interfaces
      llm-adapter.interface.ts
  
  /application
    /services
      llm.service.ts                 # Main orchestration service (<150 lines)
      llm-structured-output.service.ts # Handles structured output (<100 lines)
      llm-concurrency.service.ts     # Manages concurrency (<100 lines)
    /dto
      llm-response.dto.ts
  
  /infrastructure
    /adapters
      base-llm.adapter.ts            # Base implementation
      openai.adapter.ts              # OpenAI-specific implementation
      anthropic.adapter.ts           # Anthropic-specific implementation
      ... (other adapters)
    /factories
      llm-adapter.factory.ts         # Factory for creating adapters
  
  /interface
    /controllers
      llm.controller.ts              # REST API controller
    /dto
      llm-call.dto.ts                # Request/response DTOs
  
  llm.module.ts                      # Module definition
```

## Migration Strategy

1. **Create Shared Foundations First**:
   - Implement base classes in `/shared/domain`
   - Set up error handling and logging in `/shared`
   - Establish shared infrastructure where needed

2. **Module-by-Module Refactoring**:
   - Start with simpler, less coupled modules
   - Refactor one module at a time
   - Keep external module API stable

3. **Extract Shared Infrastructure**:
   - Move common infrastructure to `/infrastructure`
   - Maintain module-specific implementations in module
   
4. **Service Decomposition**:
   - Break large services into smaller domain-focused services
   - Maintain backward compatibility during transition

## Migration Timeline (12 weeks)

### Phase 1: Foundation (3 weeks)
- Create shared domain primitives
- Set up infrastructure directory
- Define code organization standards
- Implement first module as example (LLM)

### Phase 2: Core Modules (4 weeks)
- Refactor Identity Card module
- Refactor Prompt module
- Refactor Batch module
- Extract shared infrastructure

### Phase 3: Supporting Modules (3 weeks)
- Refactor Report module
- Refactor User/Auth module
- Consolidate shared components

### Phase 4: Cross-cutting Concerns (2 weeks)
- Clean up dependencies
- Improve error handling
- Optimize performance
- Complete documentation

## Benefits of This Approach

1. **Pragmatic Balance**:
   - Maintains NestJS module structure
   - Applies DDD principles within modules
   - Shares infrastructure where appropriate
   
2. **Cleaner Organization**:
   - Each module has clear internal structure
   - Common infrastructure is centralized
   - Cross-cutting concerns are properly managed
   
3. **Incremental Migration**:
   - Can refactor one module at a time
   - Can adopt incrementally with minimal disruption
   
4. **Better Maintainability**:
   - Smaller, focused services
   - Clear responsibility boundaries
   - Better testability

## Success Criteria

- All services respect the 300-line limit
- Clear domain boundaries within each module
- Shared infrastructure properly organized
- 80%+ test coverage for refactored modules
- No regression in functionality