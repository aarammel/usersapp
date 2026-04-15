import Database from "better-sqlite3";
import { createId } from "@paralleldrive/cuid2";

const db = new Database("dev.db");

const rows = `aiden.richardson\t1\t2026-03-01\t12
aiden.richardson\t1\t2026-03-02\t13
aiden.richardson\t1\t2026-03-03\t15
aiden.richardson\t1\t2026-03-04\t12
aiden.richardson\t1\t2026-03-05\t14
aiden.richardson\t1\t2026-03-06\t16
aiden.richardson\t1\t2026-03-07\t18
aiden.richardson\t1\t2026-03-08\t15
aiden.richardson\t1\t2026-03-09\t13
aiden.richardson\t1\t2026-03-10\t16
alexander.murphy\t1\t2026-03-01\t9
alexander.murphy\t1\t2026-03-02\t14
alexander.murphy\t1\t2026-03-03\t15
alexander.murphy\t1\t2026-03-04\t17
alexander.murphy\t1\t2026-03-05\t15
alexander.murphy\t1\t2026-03-06\t18
alexander.murphy\t1\t2026-03-07\t18
alexander.murphy\t1\t2026-03-08\t15
alexander.murphy\t1\t2026-03-09\t12
alexander.murphy\t1\t2026-03-10\t15
alexander.murphy\t1\t2026-03-11\t16
amelia.hall\t1\t2026-03-01\t13
amelia.hall\t1\t2026-03-02\t14
amelia.hall\t1\t2026-03-03\t16
amelia.hall\t1\t2026-03-04\t15
amelia.hall\t1\t2026-03-05\t17
amelia.hall\t1\t2026-03-06\t18
amelia.hall\t1\t2026-03-07\t17
amelia.hall\t1\t2026-03-08\t15
amelia.hall\t1\t2026-03-09\t17
amelia.hall\t1\t2026-03-10\t13
amelia.lewis\t1\t2026-03-01\t20
amelia.lewis\t1\t2026-03-02\t22
amelia.lewis\t1\t2026-03-03\t24
amelia.lewis\t1\t2026-03-04\t19
amelia.lewis\t1\t2026-03-05\t18
amelia.lewis\t1\t2026-03-06\t21
amelia.lewis\t1\t2026-03-07\t22
amelia.lewis\t1\t2026-03-08\t18
amelia.lewis\t1\t2026-03-09\t17
amelia.lewis\t1\t2026-03-10\t23`.split("\n").map((line) => {
  const [userName, department, date, production] = line.split("\t");
  return { userName, department: Number(department), date, production: Number(production) };
});

const userNames = [...new Set(rows.map((r) => r.userName))];
const placeholders = userNames.map(() => "?").join(",");
const users = db.prepare(`SELECT UserID, UserName FROM User WHERE UserName IN (${placeholders})`).all(...userNames);
const idMap = new Map(users.map((u) => [u.UserName, u.UserID]));

const missing = userNames.filter((n) => !idMap.has(n));
if (missing.length > 0) {
  console.error("Missing users:", missing);
  process.exit(1);
}

const insert = db.prepare(
  `INSERT INTO UserPerformance (id, userId, department, date, production) VALUES (?, ?, ?, ?, ?)`
);

const tx = db.transaction((items) => {
  for (const r of items) {
    insert.run(
      createId(),
      idMap.get(r.userName),
      r.department,
      new Date(r.date).toISOString(),
      r.production
    );
  }
});

tx(rows);
console.log(`Inserted ${rows.length} performance records`);
db.close();
