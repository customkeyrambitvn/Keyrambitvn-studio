import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { isPackingEditorEnabled, parsePackingLayout } from "@/lib/packing-layout";

export const dynamic = "force-dynamic";

const DEFAULT_FILE = path.join(process.cwd(), "public", "layouts", "packing-default.json");

/** Chỉ ghi vào repo khi dev hoặc bật rõ ràng (serverless thường không ghi được). */
function allowWriteDefaultFileToDisk(): boolean {
  return process.env.NODE_ENV === "development" || process.env.PACKING_WRITE_DEFAULT_TO_DISK === "true";
}

/**
 * POST body: JSON layout (cùng schema `parsePackingLayout`).
 * Ghi `public/layouts/packing-default.json` để mọi client tải `/layouts/packing-default.json` đều thấy bản mới.
 */
export async function POST(req: Request) {
  if (!isPackingEditorEnabled()) {
    return NextResponse.json({ ok: false as const, error: "Packing editor disabled" }, { status: 404 });
  }
  if (!allowWriteDefaultFileToDisk()) {
    return NextResponse.json(
      {
        ok: false as const,
        error:
          "Ghi packing-default.json chỉ hoạt động khi NODE_ENV=development hoặc PACKING_WRITE_DEFAULT_TO_DISK=true.",
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
    await fs.writeFile(DEFAULT_FILE, text, "utf8");
  } catch (e) {
    console.error("[api/packing-layout-default] writeFile failed:", e);
    return NextResponse.json({ ok: false as const, error: "Could not write packing-default.json" }, { status: 500 });
  }

  return NextResponse.json({ ok: true as const });
}
