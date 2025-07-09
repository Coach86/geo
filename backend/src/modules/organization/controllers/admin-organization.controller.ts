import { 
  Controller, 
  Get,
  Post, 
  Param, 
  Body,
  Query,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Logger
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { OrganizationService } from '../services/organization.service';
import { TokenService } from '../../auth/services/token.service';
import { UserService } from '../../user/services/user.service';
import { ConfigService } from '@nestjs/config';
import { PaginationDto, PaginatedResponseDto } from '../../../common/dto/pagination.dto';

class GenerateOrganizationMagicLinkDto {
  reason?: string;
}

class OrganizationMagicLinkResponseDto {
  success: boolean;
  message: string;
  magicLink: string;
}

@ApiTags('Admin - Organizations')
@Controller('admin/organizations')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminOrganizationController {
  private readonly logger = new Logger(AdminOrganizationController.name);

  constructor(
    private readonly organizationService: OrganizationService,
    private readonly tokenService: TokenService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all organizations with pagination (Admin only)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Paginated list of organizations',
  })
  async getAllOrganizations(@Query() paginationDto: PaginationDto) {
    try {
      const organizations = await this.organizationService.findAll();
      
      // Apply search filter if provided
      let filteredOrgs = organizations;
      if (paginationDto.search) {
        const searchLower = paginationDto.search.toLowerCase();
        filteredOrgs = organizations.filter(org => 
          org.id.toLowerCase().includes(searchLower) ||
          org.name?.toLowerCase().includes(searchLower)
        );
      }

      // Sort by createdAt (newest first)
      filteredOrgs.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Calculate pagination
      const total = filteredOrgs.length;
      const startIndex = paginationDto.offset;
      const endIndex = startIndex + (paginationDto.limit || 20);
      const paginatedOrgs = filteredOrgs.slice(startIndex, endIndex);
      
      // Enrich with user count and first user's email
      const enrichedOrgs = await Promise.all(paginatedOrgs.map(async (org) => {
        const users = await this.userService.findByOrganizationId(org.id);
        const firstUser = users[0]; // Use first user as the primary contact
        
        return {
          id: org.id,
          name: org.name,
          createdAt: org.createdAt,
          planName: org.stripePlanId || 'Free',
          status: org.subscriptionStatus || 'Active',
          userCount: users.length,
          ownerEmail: firstUser?.email,
        };
      }));
      
      return new PaginatedResponseDto(
        enrichedOrgs,
        total,
        paginationDto.page || 1,
        paginationDto.limit || 20
      );
    } catch (error) {
      this.logger.error(`Failed to fetch organizations: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to fetch organizations');
    }
  }

  @Post(':organizationId/magic-link')
  @ApiOperation({ 
    summary: 'Generate a magic link to access an organization (Admin only)',
    description: 'Creates a temporary access link that allows an admin to log in as any user in the specified organization'
  })
  @ApiBody({
    type: GenerateOrganizationMagicLinkDto,
    description: 'Optional reason for generating the link',
    required: false
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Magic link generated successfully',
    type: OrganizationMagicLinkResponseDto 
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async generateOrganizationMagicLink(
    @Param('organizationId') organizationId: string,
    @Body() body?: GenerateOrganizationMagicLinkDto
  ): Promise<OrganizationMagicLinkResponseDto> {
    try {
      // Verify organization exists
      const organization = await this.organizationService.findOne(organizationId);
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Find a user in the organization (use first user)
      const users = await this.userService.findByOrganizationId(organizationId);
      if (!users || users.length === 0) {
        throw new BadRequestException('No users found in this organization');
      }

      // Use the first user
      const targetUser = users[0];

      // Generate access token with special admin bypass metadata
      const tokenMetadata = { 
        userId: targetUser.id,
        organizationId,
        adminBypass: true,
        generatedAt: new Date().toISOString(),
        reason: body?.reason || 'Admin access requested'
      };
      
      const token = await this.tokenService.generateAccessToken(targetUser.id, tokenMetadata);

      // Build the magic link URL
      const baseUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const magicLink = `${baseUrl}/auth/login?token=${token}&adminBypass=true`;

      this.logger.log(`Admin generated magic link for organization ${organizationId}, user ${targetUser.id}`);

      return {
        success: true,
        message: `Magic link generated for organization: ${organization.name}`,
        magicLink
      };
    } catch (error) {
      this.logger.error(`Failed to generate organization magic link: ${error.message}`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to generate magic link');
    }
  }
}