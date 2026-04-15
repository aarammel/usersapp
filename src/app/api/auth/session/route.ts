import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  if (!session) {
    return NextResponse.json(null);
  }

  try {
    return NextResponse.json(JSON.parse(session.value));
  } catch {
    return NextResponse.json(null);
  }
}
