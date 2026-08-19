import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Body = { messages?: unknown; context?: unknown };

export const Route = createFileRoute("/api/pet-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, context } = (await request.json()) as Body;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);

        const system = [
          "You are Ctrl, the friendly AI companion pet living inside CtrlTrack,",
          "a personal life & career operating system (jobs applied, learning, certifications,",
          "goals, habits, daily goals, fitness, general tasks).",
          "Personality: warm, upbeat, a little playful — like a loyal desk buddy. Short replies (2-5 sentences),",
          "concrete next actions, no fluff, no emoji spam (at most one emoji).",
          "Use the user's live data below when relevant. If data is missing, ask one short question.",
          "Never invent items or numbers that are not in the data.",
          "",
          "USER DATA SNAPSHOT:",
          typeof context === "string" ? context : JSON.stringify(context ?? {}),
        ].join("\n");

        const result = streamText({
          model: gateway("google/gemini-3.7-flash"),
          system,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
        });
      },
    },
  },
});
