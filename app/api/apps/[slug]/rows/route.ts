import { NextResponse } from "next/server";
import { getSession } from "@/kit/auth/session";
import { AccessDenied, getAppRows } from "@/kit/view";

export const dynamic = "force-dynamic";

/** Read path for dashboards. Same authorization and masking as the grid. */
export async function GET(_request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    return NextResponse.json(await getAppRows(params.slug, session));
  } catch (err) {
    const status = err instanceof AccessDenied ? 403 : 400;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
