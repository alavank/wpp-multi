export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  DEPT_ADMIN: "DEPT_ADMIN",
  AGENT: "AGENT",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ConversationStatus = {
  WAITING: "WAITING",
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
} as const;
export type ConversationStatus =
  (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const MessageDirection = {
  INBOUND: "INBOUND",
  OUTBOUND: "OUTBOUND",
} as const;
export type MessageDirection =
  (typeof MessageDirection)[keyof typeof MessageDirection];

export const MessageType = {
  TEXT: "TEXT",
  IMAGE: "IMAGE",
  AUDIO: "AUDIO",
  VIDEO: "VIDEO",
  DOCUMENT: "DOCUMENT",
  STICKER: "STICKER",
  LOCATION: "LOCATION",
  CONTACT: "CONTACT",
  INSTANT_VIDEO: "INSTANT_VIDEO",
  SYSTEM: "SYSTEM",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const TransferStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type TransferStatus =
  (typeof TransferStatus)[keyof typeof TransferStatus];

export const ScheduledReturnStatus = {
  PENDING: "PENDING",
  NOTIFIED: "NOTIFIED",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
} as const;
export type ScheduledReturnStatus =
  (typeof ScheduledReturnStatus)[keyof typeof ScheduledReturnStatus];

export const WhatsappSessionStatus = {
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  QR_PENDING: "QR_PENDING",
} as const;
export type WhatsappSessionStatus =
  (typeof WhatsappSessionStatus)[keyof typeof WhatsappSessionStatus];

export const QueueTab = {
  WAITING: "WAITING",
  IN_PROGRESS: "IN_PROGRESS",
  FINISHED: "FINISHED",
  TRANSFERS_SENT: "TRANSFERS_SENT",
  TRANSFERS_RECEIVED: "TRANSFERS_RECEIVED",
} as const;
export type QueueTab = (typeof QueueTab)[keyof typeof QueueTab];
