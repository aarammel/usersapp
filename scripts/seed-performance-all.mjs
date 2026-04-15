import Database from "better-sqlite3";
import { createId } from "@paralleldrive/cuid2";

const db = new Database("dev.db");

const users = db.prepare("SELECT UserID, department FROM User WHERE Deleted = 0").all();
const startDate = new Date("2026-03-01T00:00:00Z");
const days = 30;

const existsStmt = db.prepare(
  "SELECT id FROM UserPerformance WHERE userId = ? AND date = ? LIMIT 1"
);
const insertStmt = db.prepare(
  "INSERT INTO UserPerformance (id, userId, department, date, production) VALUES (?, ?, ?, ?, ?)"
);

let created = 0;
let skipped = 0;

const tx = db.transaction(() => {
  for (const u of users) {
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + i);
      const iso = date.toISOString();

      if (existsStmt.get(u.UserID, iso)) {
        skipped++;
        continue;
      }

      const production = 8 + Math.floor(Math.random() * 18); // 8..25
      insertStmt.run(createId(), u.UserID, u.department, iso, production);
      created++;
    }
  }
});
tx();

console.log(`Created ${created} records, skipped ${skipped} duplicates across ${users.length} users`);
db.close();
