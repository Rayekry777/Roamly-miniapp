import { getEnvironment } from "../config/env";
import { authStore } from "../store/auth";
import type {
  CustomerServiceAttachment,
  CustomerServiceMessagePage,
  CustomerServiceTicket,
  ErrorResult,
  PageResult,
  Result,
} from "../types";
import { navigateToLogin } from "../utils/navigation";
import { ApiError, request } from "../utils/request";
import { session } from "../utils/session";

export interface CustomerServiceInput {
  type: "REFUND" | "REDEMPTION" | "ORDER" | "SETTLEMENT" | "GENERAL";
  subject: string;
  description?: string;
  orderId?: string;
  voucherId?: string;
  refundId?: string;
  redemptionId?: string;
}

export const listMyCustomerServiceTickets = (page = 1, size = 50) =>
  request<PageResult<CustomerServiceTicket>>(
    "/v1/users/me/customer-service/tickets?page=" + page + "&size=" + size,
    { showError: false },
  );

export const getMyCustomerServiceTicket = (id: string) =>
  request<CustomerServiceTicket>(
    "/v1/users/me/customer-service/tickets/" + id,
    {
      showError: false,
    },
  );

export const createMyCustomerServiceTicket = (data: CustomerServiceInput) =>
  request<CustomerServiceTicket>("/v1/users/me/customer-service/tickets", {
    method: "POST",
    data,
    dedupe: false,
    showError: false,
  });

export const listMyCustomerServiceMessages = (
  id: string,
  beforeMessageId?: string,
) =>
  request<CustomerServiceMessagePage>(
    "/v1/users/me/customer-service/tickets/" +
      id +
      "/messages?limit=30" +
      (beforeMessageId
        ? "&before_message_id=" + encodeURIComponent(beforeMessageId)
        : ""),
    { showError: false, dedupe: false },
  );

export const replyMyCustomerServiceTicket = (
  id: string,
  content: string,
  attachmentIds: string[] = [],
) =>
  request<CustomerServiceTicket>(
    "/v1/users/me/customer-service/tickets/" + id + "/messages",
    {
      method: "POST",
      data: {
        content,
        messageType: attachmentIds.length ? "IMAGE" : "TEXT",
        attachmentIds,
      },
      dedupe: false,
      showError: false,
    },
  );

export const closeMyCustomerServiceTicket = (id: string) =>
  request<CustomerServiceTicket>(
    "/v1/users/me/customer-service/tickets/" + id + "/closure",
    { method: "POST", dedupe: false, showError: false },
  );

export const reopenMyCustomerServiceTicket = (id: string) =>
  request<CustomerServiceTicket>(
    "/v1/users/me/customer-service/tickets/" + id + "/reopening",
    { method: "POST", dedupe: false, showError: false },
  );

export function uploadMyCustomerServiceAttachment(
  ticketId: string,
  filePath: string,
): Promise<CustomerServiceAttachment> {
  const token = session.getToken();
  if (!token)
    return Promise.reject(new ApiError("请先登录", 401, "UNAUTHORIZED"));
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url:
        getEnvironment().apiBaseUrl +
        "/v1/users/me/customer-service/tickets/" +
        ticketId +
        "/attachments",
      filePath,
      name: "file",
      timeout: 30000,
      header: { Authorization: "Bearer " + token },
      success(response) {
        try {
          const body = JSON.parse(response.data) as
            | Result<CustomerServiceAttachment>
            | ErrorResult;
          if (response.statusCode === 401) {
            authStore.clear();
            navigateToLogin();
            reject(new ApiError("登录已过期，请重新登录", 401, "UNAUTHORIZED"));
          } else if (response.statusCode < 200 || response.statusCode >= 300) {
            const error = body as ErrorResult;
            reject(
              new ApiError(
                error.message || "上传失败（" + response.statusCode + "）",
                response.statusCode,
                error.code,
              ),
            );
          } else {
            const data = (body as Result<CustomerServiceAttachment>).data;
            if (data) resolve(data);
            else reject(new ApiError("上传响应缺少附件", response.statusCode));
          }
        } catch {
          reject(new ApiError("上传响应格式错误", response.statusCode));
        }
      },
      fail(error) {
        reject(
          new ApiError(
            error.errMsg.includes("timeout") ? "上传超时" : "上传失败",
          ),
        );
      },
    });
  });
}

export function downloadMyCustomerServiceAttachment(
  ticketId: string,
  attachmentId: string,
): Promise<string> {
  const token = session.getToken();
  if (!token)
    return Promise.reject(new ApiError("请先登录", 401, "UNAUTHORIZED"));
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url:
        getEnvironment().apiBaseUrl +
        "/v1/users/me/customer-service/tickets/" +
        ticketId +
        "/attachments/" +
        attachmentId +
        "/content",
      timeout: 12000,
      header: { Authorization: "Bearer " + token },
      success(response) {
        if (response.statusCode === 200) resolve(response.tempFilePath);
        else reject(new ApiError("附件读取失败", response.statusCode));
      },
      fail() {
        reject(new ApiError("附件读取失败"));
      },
    });
  });
}
