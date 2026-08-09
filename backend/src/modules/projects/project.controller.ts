import { Response } from 'express';
import { z, ZodError } from 'zod';
import Project from './project.model';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

const CreateProjectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId, userId } = req.user!;
    const validatedData = CreateProjectSchema.parse(req.body);

    const project = await Project.create({
      tenantId,
      createdBy: userId,
      name: validatedData.name,
      description: validatedData.description,
      status: 'TODO',
    });

    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error: any) {
    if (error.name === 'MongoServerError' && error.code === 11000) {
      res.status(400).json({ error: 'Project with this name already exists in your organization' });
    } else if (error instanceof ZodError) {
      res.status(400).json({ error: 'Validation Error', details: error.issues });
    } else {
      console.error('Create project error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

export const getProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.user!;

    // STRICT TENANT ISOLATION: 
    // We only fetch projects where tenantId matches the logged-in user's tenantId.
    const projects = await Project.find({ tenantId }).sort({ createdAt: -1 });

    res.status(200).json({ count: projects.length, projects });
  } catch (error: any) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
