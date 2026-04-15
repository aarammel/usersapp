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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  try {
    const record = await prisma.userPerformance.update({
      where: { id },
      data: {
        userId: body.userId,
        department: body.department,
        date: new Date(body.date),
        production: body.production,
      },
      select: performanceSelect,
    });
    return NextResponse.json(record);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("PUT /api/performance/[id] failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.userPerformance.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("DELETE /api/performance/[id] failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
