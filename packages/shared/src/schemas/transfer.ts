import { z } from "zod";

export const createTransferSchema = z.object({
  conversationId: z.string().uuid(),
  toUserId: z.string().uuid(),
  note: z.string().max(1000).optional(),
});
export type CreateTransferInput = z.infer<typeof createTransferSchema>;

export const respondTransferSchema = z.object({
  accept: z.boolean(),
});
export type RespondTransferInput = z.infer<typeof respondTransferSchema>;
