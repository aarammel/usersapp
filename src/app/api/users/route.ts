import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const userSelect = {
  UserID: true,
  UserName: true,
  Name: true,
  Surname: true,
  Email: true,
  Address: true,
  Active: true,
  Deleted: true,
  UserAccess: true,
  department: true,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deleted = searchParams.get("deleted") === "true";
    const users = await prisma.user.findMany({
      where: { Deleted: deleted },
      orderBy: { UserID: "asc" },
      select: userSelect,
    });
    return NextResponse.json(users);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("GET /api/users failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const hashedPassword = body.Password
      ? await bcrypt.hash(body.Password, 10)
      : "";

    const user = await prisma.user.create({
      data: {
        UserName: body.UserName,
        Name: body.Name,
        Surname: body.Surname,
        Email: body.Email,
        Address: body.Address,
        Active: body.Active ?? true,
        Password: hashedPassword,
        UserAccess: body.UserAccess ?? 2,
        department: body.department ?? 0,
      },
      select: userSelect,
    });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const meta = (error as { meta?: { target?: string[] } }).meta;
      const field = meta?.target?.[0];
      if (field === "Email") {
        return NextResponse.json({ error: "Email address is already in use" }, { status: 400 });
      }
      if (field === "UserName") {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
      }
      return NextResponse.json({ error: `${field ?? "Field"} must be unique` }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /api/users failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
