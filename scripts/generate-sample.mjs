import XLSX from "xlsx";

const firstNames = [
  "Oliver","Jack","Noah","William","James","Lucas","Thomas","Henry","Ethan","Alexander",
  "Liam","Mason","Logan","Benjamin","Sebastian","Elijah","Mateo","Daniel","Aiden","Owen",
  "Charlotte","Amelia","Olivia","Isla","Mia","Ava","Grace","Willow","Harper","Chloe",
  "Ella","Zoe","Lily","Sophie","Emily","Aria","Layla","Evelyn","Ruby","Audrey",
  "Leo","Oscar","Archie","Charlie","Harry","Theodore","Max","Samuel","Felix","Hugo",
];

const lastNames = [
  "Smith","Jones","Williams","Brown","Wilson","Taylor","Johnson","White","Martin","Anderson",
  "Thompson","Walker","Harris","Clark","Lewis","Robinson","Young","King","Wright","Scott",
  "Hall","Green","Adams","Baker","Nelson","Carter","Mitchell","Campbell","Roberts","Turner",
  "Phillips","Evans","Collins","Edwards","Stewart","Morris","Murphy","Cook","Rogers","Morgan",
  "Bell","Howard","Ward","Cox","Richardson","Watson","Brooks","Gray","Bennett","Wood",
];

const streets = [
  "George St","Pitt St","King St","Elizabeth St","Bourke St","Collins St","Flinders St",
  "Queen St","Adelaide St","Albert St","Edward St","Ann St","Wickham St","Brunswick St",
  "Chapel St","Lonsdale St","Swanston St","Spencer St","William St","Spring St",
  "Murray St","Hay St","Wellington St","St Georges Tce","Beaufort St","Oxford St",
  "Rundle St","Hindley St","North Tce","Grenfell St","Currie St","Waymouth St",
  "Liverpool St","Macquarie St","Sandy Bay Rd","Davey St","Salamanca Pl","Harrington St",
  "Smith St","Lygon St","Sydney Rd","High St","Bridge Rd","Swan St","Toorak Rd",
  "Military Rd","Pacific Hwy","Victoria Ave","Darling St","Glebe Point Rd",
];

const suburbs = [
  { name: "Sydney", state: "NSW", postcode: "2000" },
  { name: "Melbourne", state: "VIC", postcode: "3000" },
  { name: "Brisbane", state: "QLD", postcode: "4000" },
  { name: "Perth", state: "WA", postcode: "6000" },
  { name: "Adelaide", state: "SA", postcode: "5000" },
  { name: "Hobart", state: "TAS", postcode: "7000" },
  { name: "Canberra", state: "ACT", postcode: "2600" },
  { name: "Darwin", state: "NT", postcode: "0800" },
  { name: "Parramatta", state: "NSW", postcode: "2150" },
  { name: "Bondi", state: "NSW", postcode: "2026" },
  { name: "Manly", state: "NSW", postcode: "2095" },
  { name: "St Kilda", state: "VIC", postcode: "3182" },
  { name: "Fitzroy", state: "VIC", postcode: "3065" },
  { name: "South Bank", state: "QLD", postcode: "4101" },
  { name: "Fremantle", state: "WA", postcode: "6160" },
  { name: "Glenelg", state: "SA", postcode: "5045" },
  { name: "Surry Hills", state: "NSW", postcode: "2010" },
  { name: "Newtown", state: "NSW", postcode: "2042" },
  { name: "Richmond", state: "VIC", postcode: "3121" },
  { name: "Fortitude Valley", state: "QLD", postcode: "4006" },
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const usedUsernames = new Set();
const usedEmails = new Set();

const rows = [];
for (let i = 0; i < 100; i++) {
  const first = pick(firstNames);
  const last = pick(lastNames);

  let username;
  let counter = 0;
  do {
    username = counter === 0
      ? `${first.toLowerCase()}.${last.toLowerCase()}`
      : `${first.toLowerCase()}.${last.toLowerCase()}${counter}`;
    counter++;
  } while (usedUsernames.has(username));
  usedUsernames.add(username);

  let email;
  counter = 0;
  const domains = ["gmail.com", "outlook.com.au", "yahoo.com.au", "bigpond.com", "icloud.com"];
  do {
    const prefix = counter === 0
      ? `${first.toLowerCase()}.${last.toLowerCase()}`
      : `${first.toLowerCase()}.${last.toLowerCase()}${counter}`;
    email = `${prefix}@${pick(domains)}`;
    counter++;
  } while (usedEmails.has(email));
  usedEmails.add(email);

  const streetNum = Math.floor(Math.random() * 300) + 1;
  const suburb = pick(suburbs);
  const address = `${streetNum} ${pick(streets)}, ${suburb.name} ${suburb.state} ${suburb.postcode}`;

  const accessLevel = pick([1, 2, 2, 2, 3]);
  rows.push({
    UserName: username,
    Name: first,
    Surname: last,
    Email: email,
    Address: address,
    Active: Math.random() > 0.15,
    Password: `Pass${first}${streetNum}!`,
    UserAccess: accessLevel,
    department: Math.floor(Math.random() * 10) + 1,
  });
}

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Users");
XLSX.writeFile(wb, "public/sample-users.xlsx");
console.log("Generated public/sample-users.xlsx with 100 users");
