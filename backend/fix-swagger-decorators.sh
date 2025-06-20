#!/bin/bash

echo "Fixing remaining Swagger @ApiBody decorators..."

# UserController
echo "Fixing UserController..."
sed -i.bak '/import.*ApiTags.*from.*@nestjs\/swagger/s/$/\, ApiBody/' src/modules/user/controllers/user.controller.ts
sed -i.bak '/@Post()/,/@ApiResponse/{ /@ApiResponse/{i\
  @ApiBody({ type: CreateUserDto })
} }' src/modules/user/controllers/user.controller.ts

# PlanController
echo "Fixing PlanController..."
sed -i.bak '/import.*ApiTags.*from.*@nestjs\/swagger/s/$/\, ApiBody/' src/modules/plan/controllers/plan.controller.ts
sed -i.bak '/@Post().*create/,/@ApiResponse/{ /@ApiResponse/{i\
  @ApiBody({ type: CreatePlanDto })
} }' src/modules/plan/controllers/plan.controller.ts
sed -i.bak '/@Patch.*:id/,/@ApiResponse/{ /@ApiResponse/{i\
  @ApiBody({ type: UpdatePlanDto })
} }' src/modules/plan/controllers/plan.controller.ts

# PromptSetController
echo "Fixing PromptSetController..."
sed -i.bak '/import.*ApiTags.*from.*@nestjs\/swagger/s/$/\, ApiBody/' src/modules/prompt/controllers/prompt-set.controller.ts
sed -i.bak '/@Patch.*:projectId/,/@ApiResponse/{ /@ApiResponse/{i\
  @ApiBody({ type: UpdatePromptSetDto })
} }' src/modules/prompt/controllers/prompt-set.controller.ts

# BatchController
echo "Fixing BatchController..."
sed -i.bak '/import.*ApiTags.*from.*@nestjs\/swagger/s/$/\, ApiBody/' src/modules/batch/controllers/batch.controller.ts
sed -i.bak '/@Post.*run/,/@ApiResponse/{ /@ApiResponse/{i\
  @ApiBody({ type: BatchRunDto })
} }' src/modules/batch/controllers/batch.controller.ts

echo "Done! Please review the changes and remove .bak files if everything looks good."
echo "You may need to manually create DTOs for inline objects in:"
echo "- UserOrganizationController"
echo "- PublicPlanController"
echo "- PlanController (checkout endpoint)"