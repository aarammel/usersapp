-- CreateTable
CREATE TABLE "UserPerformance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "department" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "production" INTEGER NOT NULL,
    CONSTRAINT "UserPerformance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("UserID") ON DELETE RESTRICT ON UPDATE CASCADE
);
