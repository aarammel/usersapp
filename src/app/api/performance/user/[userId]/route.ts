import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const records = await prisma.userPerformance.findMany({
      where: { userId: Number(userId) },
      orderBy: [
        { userId: "asc" },
        { date: "asc" },
      ],
      select: {
        id: true,
        userId: true,
        department: true,
        date: true,
        production: true,
      },
    });
    return NextResponse.json(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/performance/user/[userId] failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
