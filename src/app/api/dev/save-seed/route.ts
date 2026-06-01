import { NextResponse } from "next/server";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";
import type { Policy } from "@/lib/workflow/types";

const SEEDS_PATH = join(process.cwd(), "src/lib/workflow/user-seeds.json");

/** Only active in local dev — Vercel runs as read-only so writes are skipped. */
const IS_DEV = process.env.NODE_ENV === "development";

export async function POST(req: Request) {
  if (!IS_DEV) {
    return NextResponse.json(
      { error: "Save-to-seed is only available in local development." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const policy = body as Pick<
    Policy,
    "id" | "name" | "type" | "status" | "nodes" | "createdAt" | "updatedAt"
  >;

  if (!policy?.id || !policy?.nodes) {
    return NextResponse.json(
      { error: "Body must include id and nodes." },
      { status: 400 },
    );
  }

  let seeds: Policy[] = [];
  try {
    seeds = JSON.parse(readFileSync(SEEDS_PATH, "utf-8")) as Policy[];
  } catch {
    seeds = [];
  }

  const idx = seeds.findIndex((p) => p.id === policy.id);
  const entry: Policy = {
    id: policy.id,
    name: policy.name,
    type: policy.type,
    status: policy.status,
    nodes: policy.nodes,
    createdAt: policy.createdAt,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    seeds[idx] = entry;
  } else {
    seeds.push(entry);
  }

  writeFileSync(SEEDS_PATH, JSON.stringify(seeds, null, 2) + "\n", "utf-8");

  return NextResponse.json({ ok: true, saved: entry.name });
}

export async function DELETE(req: Request) {
  if (!IS_DEV) {
    return NextResponse.json({ error: "Dev only." }, { status: 403 });
  }

  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  let seeds: Policy[] = [];
  try {
    seeds = JSON.parse(readFileSync(SEEDS_PATH, "utf-8")) as Policy[];
  } catch {
    seeds = [];
  }

  seeds = seeds.filter((p) => p.id !== id);
  writeFileSync(SEEDS_PATH, JSON.stringify(seeds, null, 2) + "\n", "utf-8");

  return NextResponse.json({ ok: true });
}
