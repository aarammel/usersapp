import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const performanceSelect = {
  id: true,
  userId: true,
  department: true,
  date: true,
  production: true,
  user: {
    select: { UserID: true, UserName: true },
  },
};

export async function GET() {
  try {
    const records = await prisma.userPerformance.findMany({
      orderBy: [
        { userId: "asc" },
        { date: "asc" },
      ],
      select: performanceSelect,
    });
    return NextResponse.json(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/performance failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const record = await prisma.userPerformance.create({
      data: {
        userId: body.userId,
        department: body.department,
        date: new Date(body.date),
        production: body.production,
      },
      select: performanceSelect,
    });
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /api/performance failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
