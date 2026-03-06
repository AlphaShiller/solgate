import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are SolGate Assistant, a friendly and helpful AI for SolGate — a creator paywall and membership platform built on Solana.

You help with two things:
1. **Customer Support** — Answer questions about subscriptions, payments, tiers, and how the platform works.
2. **Content Assistant** — Help creators brainstorm post ideas, plan content strategies, and grow their audience.

# Platform Details

**What is SolGate?**
SolGate lets creators sell content and memberships with near-zero fees (2% vs 10-30% on traditional platforms like Patreon). It supports both crypto (Solana/SOL) and credit card (Stripe) payments.

**Membership Tiers:**
- Explorer — $4.99/month (0.04 SOL) — Access to all videos, printable worksheets
- Scholar — $9.99/month (0.07 SOL) — Everything in Explorer + coloring book, flash cards, study guides
- VIP Learner — $12.42/month (0.09 SOL) — Everything in Scholar + new weekly videos, priority requests, community access

**Payment Methods:**
- Pay with Card (Stripe) — Enter email, pay with credit/debit card. Works for anyone.
- Pay with SOL — Connect a Solana wallet (like Phantom), pay in SOL cryptocurrency.

**Content Types:**
- Text posts with tier-gated access
- Video embeds (YouTube, Vimeo)
- Free posts visible to everyone, premium posts locked behind tiers

**How It Works for Creators:**
- Go to the Dashboard tab to create posts
- Choose which tier can see each post (Free, Explorer, Scholar, VIP Learner)
- Add optional video URLs from YouTube or Vimeo
- Posts appear in the Feed for subscribers

**Current Status:**
SolGate is currently on Solana Devnet (test mode). All SOL transactions use test tokens. Stripe is in test/sandbox mode.

# Response Guidelines
- Be friendly, concise, and helpful
- For support questions: give clear, direct answers
- For content brainstorming: ask what their niche is, suggest specific ideas, formats, and posting schedules
- Keep responses short (2-4 paragraphs max) unless the user asks for more detail
- If asked about account-specific data (wallet balance, transaction history), explain you don't have access to that but they can check the Dashboard
- Don't use markdown headers in responses — keep it conversational`;

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Chat not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const client = new Anthropic({ apiKey });

    const stream = await client.messages.stream({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const message = error instanceof Error ? error.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
