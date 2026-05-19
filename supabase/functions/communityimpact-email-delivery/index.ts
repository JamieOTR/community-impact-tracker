// PATH: supabase/functions/communityimpact-email-delivery/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type EmailPayload = {
  recipient: string;
  subject: string;
  payload?: Record<string, unknown>;
};

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail =
      Deno.env.get("ALERT_EMAIL_FROM") ??
      "CommunityImpact <onboarding@resend.dev>";

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          provider: "resend",
          error: "Missing RESEND_API_KEY",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const body = (await req.json()) as EmailPayload;

    if (!body.recipient || !body.subject) {
      return new Response(
        JSON.stringify({
          success: false,
          provider: "resend",
          error: "Missing recipient or subject",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>CommunityImpact Governance Delivery</h2>

        <p>
          This message was delivered through the governed CommunityImpact
          delivery infrastructure.
        </p>

        <hr />

        <pre style="background:#f4f4f4;padding:12px;border-radius:6px;white-space:pre-wrap;">
${JSON.stringify(body.payload ?? {}, null, 2)}
        </pre>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: body.recipient,
        subject: body.subject,
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          provider: "resend",
          error:
            resendData?.message ??
            resendData?.error ??
            "Resend delivery failed",
          details: resendData,
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: "resend",
        messageId: resendData?.id ?? null,
        details: resendData,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        provider: "resend",
        error:
          error instanceof Error
            ? error.message
            : "Unknown email delivery failure",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
