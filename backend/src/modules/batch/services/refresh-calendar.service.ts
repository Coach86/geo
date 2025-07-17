import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project as ProjectSchema } from '../../project/schemas/project-base.schema';
import { Plan as PlanSchema } from '../../plan/schemas/plan.schema';

export interface ProjectRefreshInfo {
  projectId: string;
  brandName: string;
  organizationName: string;
  planName: string;
  refreshFrequency: string;
  createdAt: Date;
}

export interface DayRefreshData {
  day: string;
  dayIndex: number;
  projects: ProjectRefreshInfo[];
  count: number;
}

@Injectable()
export class RefreshCalendarService {
  private readonly logger = new Logger(RefreshCalendarService.name);

  constructor(
    @InjectModel('Project') private projectModel: Model<ProjectSchema>,
    @InjectModel('Plan') private planModel: Model<PlanSchema>,
  ) {}

  /**
   * Get projects with their refresh schedules for calendar view
   * @returns Projects grouped by their refresh day
   */
  async getProjectsRefreshCalendar(): Promise<DayRefreshData[]> {
    try {
      // Get all projects with their organizations and plans
      const projects = await this.projectModel.aggregate([
        {
          $lookup: {
            from: 'organizations',
            localField: 'organizationId',
            foreignField: 'id',
            as: 'organization'
          }
        },
        {
          $unwind: {
            path: '$organization',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            id: 1,
            projectId: '$id',
            brandName: 1,
            organizationId: 1,
            createdAt: 1,
            'organization.stripeSubscriptionId': 1,
            'organization.stripePlanId': 1,
            'organization.name': 1,
            'organization.refreshFrequencyOverride': 1
          }
        }
      ]);

      this.logger.log(`Found ${projects.length} total projects`);
      
      // Debug first project to see structure
      if (projects.length > 0) {
        this.logger.debug(`First project structure: ${JSON.stringify(projects[0], null, 2)}`);
      }

      // Now we need to get plan details for each project
      const plansCache = new Map<string, any>();

      // Group projects by day of week
      const projectsByDay: Record<number, ProjectRefreshInfo[]> = {
        0: [], // Sunday
        1: [], // Monday
        2: [], // Tuesday
        3: [], // Wednesday
        4: [], // Thursday
        5: [], // Friday
        6: [], // Saturday
      };

      for (const project of projects) {
        const stripePlanId = project.organization?.stripePlanId;
        const hasSubscription = !!project.organization?.stripeSubscriptionId;
        
        this.logger.debug(`Project ${project.projectId}: stripePlanId=${stripePlanId}, hasSubscription=${hasSubscription}, org=${!!project.organization}`);
        
        // Handle manual plans
        if (stripePlanId === 'manual') {
          this.logger.log(`Found manual plan project: ${project.projectId} (${project.brandName})`);
          // Manual plans use organization override or default to weekly
          const refreshFrequency = project.organization?.refreshFrequencyOverride || 'weekly';
          
          // For daily/unlimited, add to all days
          if (refreshFrequency === 'daily' || refreshFrequency === 'unlimited') {
            for (let day = 0; day < 7; day++) {
              projectsByDay[day].push({
                projectId: project.projectId,
                brandName: project.brandName,
                organizationName: project.organization?.name,
                planName: 'Manual',
                refreshFrequency: refreshFrequency,
                createdAt: project.createdAt
              });
            }
          } else {
            // For weekly, add to the specific day
            const createdDate = new Date(project.createdAt);
            const dayOfWeek = createdDate.getDay();
            projectsByDay[dayOfWeek].push({
              projectId: project.projectId,
              brandName: project.brandName,
              organizationName: project.organization?.name,
              planName: 'Manual',
              refreshFrequency: refreshFrequency,
              createdAt: project.createdAt
            });
          }
          continue;
        }

        // Skip if no plan or no subscription (free plan)
        if (!stripePlanId || !hasSubscription) {
          continue;
        }

        // Get plan details from cache or database
        let plan = plansCache.get(stripePlanId);
        if (!plan && stripePlanId) {
          plan = await this.planModel.findById(stripePlanId).lean();
          if (plan) {
            plansCache.set(stripePlanId, plan);
          }
        }

        // Skip if plan not found or is free
        if (!plan || plan.name?.toLowerCase() === 'free') {
          continue;
        }

        // Use organization override if available, otherwise use plan's refresh frequency
        const refreshFrequency = project.organization?.refreshFrequencyOverride || plan.refreshFrequency || 'weekly';
        
        // For daily/unlimited, add to all days
        if (refreshFrequency === 'daily' || refreshFrequency === 'unlimited') {
          for (let day = 0; day < 7; day++) {
            projectsByDay[day].push({
              projectId: project.projectId,
              brandName: project.brandName,
              organizationName: project.organization?.name,
              planName: plan.name,
              refreshFrequency: refreshFrequency,
              createdAt: project.createdAt
            });
          }
        } else {
          // For weekly, add to the specific day
          const createdDate = new Date(project.createdAt);
          const dayOfWeek = createdDate.getDay();
          projectsByDay[dayOfWeek].push({
            projectId: project.projectId,
            brandName: project.brandName,
            organizationName: project.organization?.name,
            planName: plan.name,
            refreshFrequency: refreshFrequency,
            createdAt: project.createdAt
          });
        }
      }

      // Convert to array format with day names
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const result = dayNames.map((dayName, index) => ({
        day: dayName,
        dayIndex: index,
        projects: projectsByDay[index],
        count: projectsByDay[index].length
      }));

      return result;
    } catch (error) {
      this.logger.error(`Failed to get refresh calendar: ${error.message}`, error.stack);
      throw error;
    }
  }
}