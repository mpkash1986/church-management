import { NextResponse } from "next/server";
import { cookies } from "next/headers";
export async function POST(req: Request) {
  (await cookies()).delete("church_session");
  return NextResponse.redirect(new URL("/login", req.url), 303);
}