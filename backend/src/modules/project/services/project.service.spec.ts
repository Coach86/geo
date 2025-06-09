import { Test, TestingModule } from '@nestjs/testing';
import { ProjectService } from './project.service';
import { ProjectRepository } from '../repositories/project.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LlmService } from '../../llm/services/llm.service';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockProjectRepository = {
    save: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    findByOrganizationId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    mapToEntity: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockLlmService = {
    getStructuredOutput: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: ProjectRepository,
          useValue: mockProjectRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
        {
          provide: LlmService,
          useValue: mockLlmService,
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
  });

  describe('stripUrlProtocol', () => {
    it('should remove http:// protocol', () => {
      const result = service['stripUrlProtocol']('http://example.com/');
      expect(result).toBe('example.com');
    });

    it('should remove https:// protocol', () => {
      const result = service['stripUrlProtocol']('https://example.com/');
      expect(result).toBe('example.com');
    });

    it('should remove ftp:// protocol', () => {
      const result = service['stripUrlProtocol']('ftp://example.com/');
      expect(result).toBe('example.com');
    });

    it('should remove protocol-relative //', () => {
      const result = service['stripUrlProtocol']('//example.com/');
      expect(result).toBe('example.com');
    });

    it('should remove trailing slashes', () => {
      const result = service['stripUrlProtocol']('https://example.com/');
      expect(result).toBe('example.com');
    });

    it('should remove multiple trailing slashes', () => {
      const result = service['stripUrlProtocol']('https://example.com///');
      expect(result).toBe('example.com');
    });

    it('should handle URLs with paths correctly', () => {
      const result = service['stripUrlProtocol']('https://example.com/path/to/page/');
      expect(result).toBe('example.com/path/to/page');
    });

    it('should handle URLs without trailing slashes', () => {
      const result = service['stripUrlProtocol']('https://example.com');
      expect(result).toBe('example.com');
    });

    it('should handle empty string', () => {
      const result = service['stripUrlProtocol']('');
      expect(result).toBe('');
    });

    it('should handle null/undefined gracefully', () => {
      const result = service['stripUrlProtocol'](null as any);
      expect(result).toBe('');
    });

    it('should trim whitespace', () => {
      const result = service['stripUrlProtocol']('  https://example.com/  ');
      expect(result).toBe('example.com');
    });

    it('should handle mixed case protocols', () => {
      const result = service['stripUrlProtocol']('HTTPS://example.com/');
      expect(result).toBe('example.com');
    });
  });
});