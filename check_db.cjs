const Database = require('better-sqlite3');
const db = new Database('association_v3.db');

const bobosAsso = db.prepare("SELECT id FROM associations WHERE username = 'bobosetgamelles'").get();
if (bobosAsso) {
  db.prepare("UPDATE users SET association_id = ? WHERE association_id IS NULL").run(bobosAsso.id);
  console.log("Updated users to association_id", bobosAsso.id);
}

const users = db.prepare("SELECT id, username, association_id FROM users").all();
console.log("Users:", users);
