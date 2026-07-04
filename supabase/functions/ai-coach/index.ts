import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const tools = [
  {
    type: "function",
    function: {
      name: "create_recommendation",
      description: "Create a prioritized recommendation for the user based on their real data.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          body: { type: "string" },
          tone: { type: "string", enum: ["positive", "warning", "info", "suggestion"] },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          category_name: { type: "string", description: "Related category, if any" },
        },
        required: ["title", "body", "tone", "priority"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "flag_item_at_risk",
      description: "Flag a specific item as at-risk (overdue goal, stale habit, etc).",
      parameters: {
        type: "object",
        properties: {
          item_id: { type: "string" },
          reason: { type: "string" },
        },
        required: ["item_id", "reason"],
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [{ data: items }, { data: categories }, { data: activities }, { data: pastRecs }] =
      await Promise.all([
        userClient.from("items").select("*").eq("user_id", userId),
        userClient.from("categories").select("*").eq("user_id", userId),
        userClient.from("activities").select("*").eq("user_id", userId)
          .order("created_at", { ascending: false }).limit(50),
        userClient.from("agent_recommendations").select("title, body, status, created_at")
          .eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
      ]);

    const categoryById = new Map((categories ?? []).map((c: any) => [c.id, c.name]));

    const systemPrompt = `You are CtrlTrack's AI Coach, a productivity and career mentor.
You are given the user's categories, items, recent activity, and your own past recommendations (memory).
Plan step by step: (1) what's going well, (2) what's falling behind or at risk, (3) the 2-4 most useful
recommendations right now. Avoid repeating a past recommendation still marked "active" unless there is new evidence.
Use create_recommendation for each recommendation, and flag_item_at_risk only for specific overdue/stale items.
Be concise and specific, referencing real numbers from the data. Never invent data not present in the input.`;

    const userPayload = {
      categories: categories ?? [],
      items: (items ?? []).map((i: any) => ({
        id: i.id, title: i.title, completed: i.completed, priority: i.priority,
        category: categoryById.get(i.category_id) ?? "Unknown",
        created_at: i.created_at, updated_at: i.updated_at, completed_at: i.completed_at,
      })),
      recent_activity_count: (activities ?? []).length,
      past_recommendations: pastRecs ?? [],
    };

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Here is my current CtrlTrack data:\n\n${JSON.stringify(userPayload, null, 2)}\n\nAnalyze it and generate recommendations.`,
      },
    ];

    const toolCallLog: any[] = [];
    let finalSummary = "";
    let loopGuard = 0;

    while (loopGuard < 4) {
      loopGuard++;
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages,
          tools,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error("AI Gateway error", data);
        return new Response(JSON.stringify({ error: "AI request failed", detail: data }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message = data.choices?.[0]?.message;
      const toolCalls = message?.tool_calls ?? [];
      finalSummary = message?.content || finalSummary;

      if (!toolCalls.length) break;

      messages.push({ role: "assistant", content: message.content ?? "", tool_calls: toolCalls });

      for (const call of toolCalls) {
        const args = JSON.parse(call.function.arguments || "{}");
        toolCallLog.push({ name: call.function.name, input: args });

        let toolResultContent = "Unknown tool, ignored.";

        if (call.function.name === "create_recommendation") {
          const cat = categories?.find(
            (c: any) => c.name.toLowerCase() === (args.category_name ?? "").toLowerCase(),
          );
          await adminClient.from("agent_recommendations").insert({
            user_id: userId,
            title: args.title,
            body: args.body,
            tone: args.tone,
            priority: args.priority,
            category_id: cat?.id ?? null,
          });
          toolResultContent = "Recommendation saved.";
        } else if (call.function.name === "flag_item_at_risk") {
          toolResultContent = `Noted item ${args.item_id} as at-risk: ${args.reason}`;
        }

        messages.push({ role: "tool", tool_call_id: call.id, content: toolResultContent });
      }
    }

    await adminClient.from("agent_runs").insert({
      user_id: userId,
      plan: [{ step: "gather_data" }, { step: "reason_and_call_tools" }, { step: "summarize" }],
      tool_calls: toolCallLog,
      summary: finalSummary,
    });

    const { data: freshRecs } = await userClient
      .from("agent_recommendations").select("*").eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(10);

    return new Response(
      JSON.stringify({ summary: finalSummary, trace: toolCallLog, recommendations: freshRecs ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
