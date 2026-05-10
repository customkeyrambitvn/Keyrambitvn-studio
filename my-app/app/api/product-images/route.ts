import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const dir = path.join(process.cwd(), "public", "products");
  let filenames: string[] = [];
  try {
    filenames = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((name) => !name.startsWith(".") && /\.(png|jpe?g|webp|gif)$/i.test(name));
  } catch {
    filenames = [];
  }
  return NextResponse.json({ filenames });
}
