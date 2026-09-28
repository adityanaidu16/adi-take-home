import { NextResponse } from "next/server";
import { getSession } from "@/kit/auth/session";
import { AccessDenied, getAppAggregate } from "@/kit/view";

export const dynamic = "force-dynamic";

/** Aggregates for dashboard tiles and charts, computed server-side. */
export async function GET(request: Request, { params }: { params: { slug: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const url = new URL(request.url);
  const groupBy = url.searchParams.get("groupBy");
  const measure = url.searchParams.get("measure") ?? undefined;
  if (!groupBy) return NextResponse.json({ error: "groupBy is required" }, { status: 400 });

  try {
    return NextResponse.json(await getAppAggregate(params.slug, session, { groupBy, measure }));
  } catch (err) {
    const status = err instanceof AccessDenied ? 403 : 400;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}
