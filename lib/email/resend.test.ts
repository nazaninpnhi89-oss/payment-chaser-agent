import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const mockEnv: {
  SENDING_ENABLED: boolean;
  TEST_REDIRECT_EMAIL: string | null;
  RESEND_API_KEY: string;
  RESEND_FROM_EMAIL: string;
} = {
  SENDING_ENABLED: false,
  TEST_REDIRECT_EMAIL: null,
  RESEND_API_KEY: "re_test",
  RESEND_FROM_EMAIL: "Test Sender <sender@example.com>",
};

vi.mock("@/lib/env", () => ({
  get env() {
    return mockEnv;
  },
}));

const baseInput = {
  to: "client@real-recipient.example",
  subject: "Invoice INV-001 overdue",
  bodyText: "Please settle this invoice.",
  bodyHtml: "<p>Please settle this invoice.</p>",
  replyTo: "accounts@sender.example",
};

describe("sendChaseEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({ data: { id: "email_123" }, error: null });
    mockEnv.SENDING_ENABLED = false;
    mockEnv.TEST_REDIRECT_EMAIL = null;
  });

  it("never calls the Resend client when SENDING_ENABLED is false", async () => {
    const { sendChaseEmail } = await import("@/lib/email/resend");
    const result = await sendChaseEmail(baseInput);

    expect(sendMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      dispatched: false,
      reason: "sending_disabled",
      renderedPreview: { subject: baseInput.subject, html: baseInput.bodyHtml },
    });
  });

  it("redirects to TEST_REDIRECT_EMAIL and prefixes the subject when set", async () => {
    mockEnv.SENDING_ENABLED = true;
    mockEnv.TEST_REDIRECT_EMAIL = "test-inbox@example.com";

    const { sendChaseEmail } = await import("@/lib/email/resend");
    const result = await sendChaseEmail(baseInput);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test-inbox@example.com",
        subject: `[would send to: ${baseInput.to}] ${baseInput.subject}`,
      }),
    );
    expect(result).toMatchObject({
      dispatched: true,
      actualRecipient: "test-inbox@example.com",
    });
  });

  it("sends to the real recipient with the original subject when no redirect is set", async () => {
    mockEnv.SENDING_ENABLED = true;
    mockEnv.TEST_REDIRECT_EMAIL = null;

    const { sendChaseEmail } = await import("@/lib/email/resend");
    await sendChaseEmail(baseInput);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: baseInput.to, subject: baseInput.subject }),
    );
  });

  it("blocks dispatch and does not call Resend when the safety check fails", async () => {
    mockEnv.SENDING_ENABLED = true;

    const { sendChaseEmail } = await import("@/lib/email/resend");
    const result = await sendChaseEmail({
      ...baseInput,
      bodyText: "Interest will be charged on this overdue amount.",
    });

    expect(sendMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({ dispatched: false, reason: "blocked_by_safety_check" });
  });
});
