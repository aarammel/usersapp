import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ department: string }> }
) {
  try {
    const { department } = await params;
    const records = await prisma.userPerformance.findMany({
      where: { department: Number(department) },
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
        user: { select: { UserName: true, UserAccess: true } },
      },
    });
    return NextResponse.json(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/performance/department/[department] failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
