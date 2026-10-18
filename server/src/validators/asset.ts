import { z } from 'zod';
import { AssetPurpose } from '@prisma/client';

export const uploadBody = z.object({ purpose: z.enum(AssetPurpose) });
