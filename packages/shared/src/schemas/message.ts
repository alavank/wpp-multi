import { z } from "zod";
import { MessageType } from "../enums.js";

export const sendTextMessageSchema = z.object({
  conversationId: z.string().uuid(),
  body: z.string().min(1).max(4096),
});
export type SendTextMessageInput = z.infer<typeof sendTextMessageSchema>;

export const sendMediaMessageSchema = z.object({
  conversationId: z.string().uuid(),
  type: z.enum([
    MessageType.IMAGE,
    MessageType.AUDIO,
    MessageType.VIDEO,
    MessageType.DOCUMENT,
    MessageType.INSTANT_VIDEO,
  ]),
  mediaId: z.string().uuid(),
  caption: z.string().max(1024).optional(),
});
export type SendMediaMessageInput = z.infer<typeof sendMediaMessageSchema>;
