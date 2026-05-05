import { z } from "zod";

export const createScheduledReturnSchema = z.object({
  conversationId: z.string().uuid(),
  scheduledFor: z.coerce.date(),
  subject: z.string().min(1).max(500),
  notifyOnSave: z.boolean().default(false),
});

export type CreateScheduledReturnInput = z.infer<
  typeof createScheduledReturnSchema
>;
