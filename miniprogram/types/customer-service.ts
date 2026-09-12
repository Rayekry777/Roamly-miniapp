export interface CustomerServiceAttachment {
  id: string;
  ticketId: string;
  messageId?: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
}

export interface CustomerServiceMessage {
  id: string;
  ticketId: string;
  senderType: string;
  visibility: string;
  messageType: string;
  content?: string;
  createTime?: string;
  attachments: CustomerServiceAttachment[];
}

export interface CustomerServiceMessagePage {
  items: CustomerServiceMessage[];
  oldestMessageId?: string;
  newestMessageId?: string;
  hasMore: boolean;
}

export interface CustomerServiceTicket {
  id: string;
  ticketNo: string;
  type: string;
  status: string;
  priority: string;
  subject: string;
  description?: string;
  orderId?: string;
  voucherId?: string;
  refundId?: string;
  redemptionId?: string;
  unreadCount: number;
  lastMessageTime?: string;
  createTime?: string;
}
