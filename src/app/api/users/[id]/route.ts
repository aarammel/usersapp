import { NextResponse } from "next/server";
import { cookies } from "next/headers";
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");
    if (sessionCookie) {
      const session = JSON.parse(sessionCookie.value);
      if (session.UserAccess === 2) {
        const targetUser = await prisma.user.findUnique({
          where: { UserID: Number(id) },
          select: { UserAccess: true },
        });
        if (targetUser?.UserAccess === 3) {
          return NextResponse.json(
            { error: "You do not have permission to edit high access users" },
            { status: 403 }
          );
        }
      }
    }

    const data: Record<string, unknown> = {
      UserName: body.UserName,
      Name: body.Name,
      Surname: body.Surname,
      Email: body.Email,
      Address: body.Address,
      Active: body.Active,
      UserAccess: body.UserAccess ?? 2,
      department: body.department ?? 0,
    };

    if (body.Password) {
      data.Password = await bcrypt.hash(body.Password, 10);
    }

    const user = await prisma.user.update({
      where: { UserID: Number(id) },
      data,
      select: userSelect,
    });
    return NextResponse.json(user);
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
    console.error("PUT /api/users/[id] failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.user.update({
    where: { UserID: Number(id) },
    data: { Deleted: false },
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get("permanent") === "true";

  if (permanent) {
    await prisma.user.delete({ where: { UserID: Number(id) } });
  } else {
    await prisma.user.update({
      where: { UserID: Number(id) },
      data: { Deleted: true },
    });
  }
  return NextResponse.json({ success: true });
}
