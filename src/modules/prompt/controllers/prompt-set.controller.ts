import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../services/prisma.service';

@Controller('prompt-set')
export class PromptSetController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':companyId')
  async getPromptSet(@Param('companyId') companyId: string) {
    const promptSet = await this.prisma.promptSet.findUnique({
      where: { companyId },
    });
    if (!promptSet) {
      throw new NotFoundException('Prompt set not found');
    }
    return promptSet;
  }
}
