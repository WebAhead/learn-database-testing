const fs = require("fs");
const path = require("path");
const db = require("./connection");

// get the contents of our init.sql file
const initPath = path.join(__dirname, "init.sql");
const initSQL = fs.readFileSync(initPath, "utf-8");

function build() {
  return db.query(initSQL);
}

module.exports = build;
