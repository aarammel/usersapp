-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "UserID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "UserName" TEXT NOT NULL,
    "Name" TEXT NOT NULL,
    "Surname" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "Address" TEXT NOT NULL,
    "Active" BOOLEAN NOT NULL DEFAULT true,
    "Deleted" BOOLEAN NOT NULL DEFAULT false,
    "Password" TEXT NOT NULL DEFAULT '',
    "UserAccess" INTEGER NOT NULL DEFAULT 2
);
INSERT INTO "new_User" ("Active", "Address", "Deleted", "Email", "Name", "Surname", "UserID", "UserName") SELECT "Active", "Address", "Deleted", "Email", "Name", "Surname", "UserID", "UserName" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_UserName_key" ON "User"("UserName");
CREATE UNIQUE INDEX "User_Email_key" ON "User"("Email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
