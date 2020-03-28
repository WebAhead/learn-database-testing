const db = require("./database/connection");

function getUsers() {
  return db.query("SELECT * FROM users").then(result => result.rows);
}

function createUser(data) {
  const values = [data.username, data.age, data.location];
  return db.query(
    "INSERT INTO users(username, age, location) VALUES($1, $2, $3)",
    values
  );
}

function getPosts() {
  return db
    .query(
      `
      SELECT users.username, blog_posts.text_content
      FROM blog_posts LEFT JOIN users
      ON users.id = blog_posts.user_id
      ORDER BY users.id;
      `
    )
    .then(result => result.rows);
}

module.exports = { getUsers, createUser, getPosts };
