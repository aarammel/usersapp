import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type UserRow = {
  UserName: string;
  Name: string;
  Surname: string;
  Email: string;
  Address: string;
  Active: boolean;
  Password: string;
  UserAccess: number;
  department: number;
};

type RowResult = {
  row: number;
  UserName: string;
  Name: string;
  Surname: string;
  Email: string;
  Address: string;
  Active: boolean;
  UserAccess: number;
  department: number;
  status: "Success" | string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const { users } = (await request.json()) as { users: UserRow[] };
    const results: RowResult[] = [];

    const existingUsers = await prisma.user.findMany({
      select: { UserName: true, Email: true },
    });
    const existingUserNames = new Set(existingUsers.map((u) => u.UserName.toLowerCase()));
    const existingEmails = new Set(existingUsers.map((u) => u.Email.toLowerCase()));

    const batchUserNames = new Set<string>();
    const batchEmails = new Set<string>();

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const rowNum = i + 1;

      const rawAccess = Number(u.UserAccess);
      const userAccess = [1, 2, 3].includes(rawAccess) ? rawAccess : 2;
      const department = Number.isFinite(Number(u.department)) ? Number(u.department) : 0;

      const base = {
        row: rowNum,
        UserName: u.UserName ?? "",
        Name: u.Name ?? "",
        Surname: u.Surname ?? "",
        Email: u.Email ?? "",
        Address: u.Address ?? "",
        Active: u.Active ?? true,
        UserAccess: userAccess,
        department,
      };

      const errors: string[] = [];

      if (!u.UserName?.trim()) errors.push("Missing required field: UserName");
      if (!u.Name?.trim()) errors.push("Missing required field: Name");
      if (!u.Surname?.trim()) errors.push("Missing required field: Surname");
      if (!u.Email?.trim()) {
        errors.push("Missing required field: Email");
      } else if (!EMAIL_RE.test(u.Email.trim())) {
        errors.push("Invalid email format");
      }

      if (errors.length === 0) {
        const userNameLower = u.UserName.trim().toLowerCase();
        const emailLower = u.Email.trim().toLowerCase();

        if (existingUserNames.has(userNameLower) || batchUserNames.has(userNameLower)) {
          errors.push("Username already exists");
        }
        if (existingEmails.has(emailLower) || batchEmails.has(emailLower)) {
          errors.push("Email already exists");
        }
      }

      if (errors.length > 0) {
        results.push({ ...base, status: errors.join("; ") });
        continue;
      }

      try {
        const password = u.Password
          ? await bcrypt.hash(String(u.Password), 10)
          : "";

        await prisma.user.create({
          data: {
            UserName: u.UserName.trim(),
            Name: u.Name.trim(),
            Surname: u.Surname.trim(),
            Email: u.Email.trim(),
            Address: (u.Address ?? "").trim(),
            Active: u.Active ?? true,
            Password: password,
            UserAccess: userAccess,
            department,
          },
        });
        batchUserNames.add(u.UserName.trim().toLowerCase());
        batchEmails.add(u.Email.trim().toLowerCase());
        results.push({ ...base, status: "Success" });
      } catch (error) {
        const code = error instanceof Error && "code" in error
          ? (error as { code: string }).code
          : "";
        if (code === "P2002") {
          const meta = (error as { meta?: { target?: string[] } }).meta;
          const field = meta?.target?.[0];
          if (field === "Email") {
            results.push({ ...base, status: "Email already exists" });
          } else if (field === "UserName") {
            results.push({ ...base, status: "Username already exists" });
          } else {
            results.push({ ...base, status: `${field ?? "Field"} must be unique` });
          }
        } else {
          const msg = error instanceof Error ? error.message : String(error);
          results.push({ ...base, status: msg });
        }
      }
    }

    const successCount = results.filter((r) => r.status === "Success").length;
    const failedCount = results.length - successCount;

    return NextResponse.json(
      { total: results.length, successCount, failedCount, results },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("POST /api/users/bulk failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
