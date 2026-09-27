import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/kit/auth/session";

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
