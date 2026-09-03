import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Quest, QuestRisk } from "@/lib/types";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
};

const XP_BY_RISK: Record<QuestRisk, number> = {
  low: 10, medium: 30, high: 75, critical: 150,
};

function getSB() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  const expected = process.env.MCP_API_KEY;
  if (!expected || apiKey !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  const sb = getSB();
  if (!sb) return NextResponse.json({ error: "DB not configured" }, { status: 500, headers: CORS });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
  }

  const title = (body.title as string)?.trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400, headers: CORS });

  const risk = (body.risk as QuestRisk) ?? "medium";
  const now = new Date().toISOString();

  const quest: Quest = {
    id: crypto.randomUUID(),
    title,
    description: (body.description as string) ?? "",
    status: "backlog",
    risk,
    universe: "odyssey",
    missionClass: "odyssey",
    client: (body.client as string) || undefined,
    dueDate: (body.due_date as string) || undefined,
    tags: (body.tags as string[]) ?? [],
    createdAt: now,
    updatedAt: now,
    xpReward: XP_BY_RISK[risk],
    subtasks: [],
  };

  const { error } = await sb.from("quests").insert({ id: quest.id, data: quest, updated_at: now });
  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

  return NextResponse.json({ id: quest.id, title: quest.title }, { status: 201, headers: CORS });
}
