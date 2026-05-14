import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isPackingEditorEnabled, parsePackingLayout } from "@/lib/packing-layout";

export const dynamic = "force-dynamic";

const MOBILE_FILE = path.join(process.cwd(), "public", "layouts", "packing-layout-mobile.json");

function allowWriteMobileFileToDisk(): boolean {
  return process.env.NODE_ENV === "development" || process.env.PACKING_WRITE_DEFAULT_TO_DISK === "true";
}

/**
 * POST body: JSON layout (cùng schema `parsePackingLayout`).
 * Ghi `public/layouts/packing-layout-mobile.json`.
 */
export async function POST(req: Request) {
  if (!isPackingEditorEnabled()) {
    return NextResponse.json({ ok: false as const, error: "Packing editor disabled" }, { status: 404 });
  }
  if (!allowWriteMobileFileToDisk()) {
    return NextResponse.json(
      {
        ok: false as const,
        error:
          "Ghi packing-layout-mobile.json chỉ hoạt động khi NODE_ENV=development hoặc PACKING_WRITE_DEFAULT_TO_DISK=true.",
      },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false as const, error: "Invalid JSON body" }, { status: 400 });
  }

  const layout = parsePackingLayout(body);
  if (!layout) {
    return NextResponse.json({ ok: false as const, error: "Layout failed parsePackingLayout validation" }, { status: 400 });
  }

  const text = JSON.stringify(layout, null, 2);
  try {
    await fs.writeFile(MOBILE_FILE, text, "utf8");
  } catch (e) {
    console.error("[api/packing-layout-mobile] writeFile failed:", e);
    return NextResponse.json({ ok: false as const, error: "Could not write packing-layout-mobile.json" }, { status: 500 });
  }

  return NextResponse.json({ ok: true as const });
}
