import { NextRequest, NextResponse } from "next/server";
import { isValidAccessToken } from "@/lib/oauth";
import { createClient } from "@supabase/supabase-js";
import type { Quest, QuestRisk } from "@/lib/types";

export const maxDuration = 30;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Session-Id, MCP-Protocol-Version",
};

const XP_BY_RISK: Record<QuestRisk, number> = {
  low: 10,
  medium: 30,
  high: 75,
  critical: 150,
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

function rpc(id: unknown, result: unknown) {
  return json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: unknown, code: number, message: string) {
  return json({ jsonrpc: "2.0", id, error: { code, message } });
}

const TOOLS = [
  {
    name: "create_ticket",
    description: "Create a new ticket (quest) in Quest Log. Use this to add tasks with a title, description, deadline, client and priority.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Ticket title (required)" },
        description: { type: "string", description: "Detailed description of the task" },
        due_date: { type: "string", description: "Deadline in ISO format, e.g. 2025-09-15" },
        client: { type: "string", description: "Client name associated with this ticket" },
        risk: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description: "Priority level — low, medium, high, or critical. Default: medium",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tickets",
    description: "List tickets (quests) from Quest Log, optionally filtered by status.",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: ["backlog", "active", "done", "all"],
          description: "Filter by status. Default: all",
        },
        limit: { type: "number", description: "Max number of tickets to return. Default: 20" },
      },
    },
  },
];

async function handleCreateTicket(args: Record<string, unknown>): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) return "❌ Supabase not configured (missing env vars).";

  const title = (args.title as string)?.trim();
  if (!title) return "❌ Title is required.";

  const risk = (args.risk as QuestRisk) ?? "medium";
  const now = new Date().toISOString();

  const quest: Quest = {
    id: crypto.randomUUID(),
    title,
    description: (args.description as string) ?? "",
    status: "backlog",
    risk,
    universe: "odyssey",
    missionClass: "odyssey",
    client: (args.client as string) ?? undefined,
    dueDate: (args.due_date as string) ?? undefined,
    createdAt: now,
    updatedAt: now,
    xpReward: XP_BY_RISK[risk],
    subtasks: [],
    tags: [],
  };

  const { error } = await supabase
    .from("quests")
    .insert({ id: quest.id, data: quest, updated_at: now });

  if (error) return `❌ Failed to create ticket: ${error.message}`;

  const lines = [
    `✅ Ticket created successfully!`,
    `**Title:** ${quest.title}`,
    `**ID:** ${quest.id}`,
    `**Priority:** ${quest.risk}`,
    quest.client ? `**Client:** ${quest.client}` : null,
    quest.dueDate ? `**Due:** ${quest.dueDate}` : null,
    quest.description ? `**Description:** ${quest.description}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}

async function handleListTickets(args: Record<string, unknown>): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) return "❌ Supabase not configured.";

  const statusFilter = (args.status as string) ?? "all";
  const limit = Math.min((args.limit as number) ?? 20, 50);

  const query = supabase
    .from("quests")
    .select("data")
    .order("updated_at", { ascending: false })
    .limit(limit);

  const { data, error } = await query;
  if (error) return `❌ Failed to fetch tickets: ${error.message}`;
  if (!data || data.length === 0) return "No tickets found.";

  const quests = data
    .map((r: { data: Quest }) => r.data)
    .filter((q: Quest) => statusFilter === "all" || q.status === statusFilter);

  if (quests.length === 0) return `No tickets with status "${statusFilter}".`;

  const lines = quests.map((q: Quest) => {
    const parts = [`• **${q.title}** [${q.risk}] — ${q.status}`];
    if (q.client) parts.push(`  Client: ${q.client}`);
    if (q.dueDate) parts.push(`  Due: ${q.dueDate}`);
    return parts.join("\n");
  });

  return `**${quests.length} ticket(s):**\n\n${lines.join("\n\n")}`;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return json({ status: "ok", server: "quest-log-mcp" });
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token || !isValidAccessToken(token)) {
    const base = `https://${req.headers.get("host") ?? ""}`;
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32001, message: "Unauthorized" } }),
      {
        status: 401,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer realm="mcp", resource_metadata="${base}/.well-known/oauth-protected-resource"`,
        },
      }
    );
  }

  let body: { jsonrpc: string; method: string; params?: Record<string, unknown>; id?: unknown };
  try {
    body = await req.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const { method, params, id } = body;

  if (method === "initialize") {
    return rpc(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "quest-log", version: "1.0.0" },
    });
  }

  if (method === "notifications/initialized") {
    return new Response(null, { status: 202, headers: CORS_HEADERS });
  }

  if (method === "tools/list") {
    return rpc(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const name = params?.name as string;
    const args = (params?.arguments ?? {}) as Record<string, unknown>;

    try {
      let result = "";
      if (name === "create_ticket") {
        result = await handleCreateTicket(args);
      } else if (name === "list_tickets") {
        result = await handleListTickets(args);
      } else {
        return rpc(id, { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true });
      }
      return rpc(id, { content: [{ type: "text", text: result }] });
    } catch (err) {
      return rpc(id, { content: [{ type: "text", text: `❌ ${err instanceof Error ? err.message : String(err)}` }], isError: true });
    }
  }

  if (!id) return new Response(null, { status: 202, headers: CORS_HEADERS });

  return rpcError(id, -32601, `Method not found: ${method}`);
}
