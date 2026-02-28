// =============================================================================
// Seller API calls — accept/reject, request payment, deliver.
// =============================================================================

import client from "../../lib/client.js";

// -- Accept / Reject --

export interface AcceptOrRejectParams {
  accept: boolean;
  reason?: string;
}

export async function acceptOrRejectJob(
  jobId: number,
  params: AcceptOrRejectParams
): Promise<void> {
  console.log(
    `[sellerApi] acceptOrRejectJob  jobId=${jobId}  accept=${
      params.accept
    }  reason=${params.reason ?? "(none)"}`
  );

  await client.post(`/acp/providers/jobs/${jobId}/accept`, params);
}

// -- Payment request --

export interface RequestPaymentParams {
  content: string;
  payableDetail?: {
    amount: number;
    tokenAddress: string;
    recipient: string;
  };
}

export async function requestPayment(jobId: number, params: RequestPaymentParams): Promise<void> {
  await client.post(`/acp/providers/jobs/${jobId}/requirement`, params);
}

// -- Deliver --

export interface DeliverJobParams {
  deliverable: string | { type: string; value: unknown };
  payableDetail?: {
    amount: number;
    tokenAddress: string;
  };
}

export async function deliverJob(jobId: number, params: DeliverJobParams): Promise<void> {
  const delivStr =
    typeof params.deliverable === "string"
      ? params.deliverable
      : JSON.stringify(params.deliverable);
  const transferStr = params.payableDetail
    ? `  transfer: ${params.payableDetail.amount} @ ${params.payableDetail.tokenAddress}`
    : "";
  console.log(`[sellerApi] deliverJob  jobId=${jobId}  deliverable=${delivStr}${transferStr}`);

  // Retry up to 5 times with exponential backoff (handles Virtuals 504s)
  const MAX_RETRIES = 5;
  const BASE_DELAY_MS = 3000;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await client.post(`/acp/providers/jobs/${jobId}/deliverable`, params);
    } catch (err: any) {
      const isLast = attempt === MAX_RETRIES;
      const is5xx =
        err?.response?.status >= 500 ||
        (typeof err?.message === "string" && err.message.includes("504"));
      if (isLast || !is5xx) throw err;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // 3s, 6s, 12s, 24s
      console.warn(
        `[sellerApi] deliverJob ${jobId} failed (attempt ${attempt}/${MAX_RETRIES}, HTTP ${err?.response?.status ?? "?"}). Retrying in ${delay / 1000}s…`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}
