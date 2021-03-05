const db = require("./database/connection");

function home(req, res) {
  db.query("SELECT * FROM users").then(result => {
    const users = result.rows;
    // create a list item for each user in the array
    const userList = users.map(user => `<li>${user.username}</li>`);
    // use .join to turn the array into a string
    res.status(200).send(`<ul>${userList.join("")}</ul>`);
  });
}

function newUser(req, res) {
  res.status(200).send(`
    <form action="create-user" method="POST">
      <label for="username">Username</label>
      <input id="username" name="username">
      <label for="age">Age</label>
      <input id="age" name="age" type="number">
      <label for="location">Location</label>
      <input id="location" name="location">
      <button type="submit">Create user</button>
    </form>
  `);
}

function createUser(req, res) {
  const data = req.body
  const values = [data.username, data.age, data.location];
  db.query(
    "INSERT INTO users(username, age, location) VALUES($1, $2, $3)",
    values
  )
    .then(() => {
      res.redirect('/');
    })
    .catch(error => {
      console.log(error);
      res.status(500).send(`<h1>Something went wrong saving your data</h1>`);
    });
}

function allPosts(req, res) {
  db.query(
    `
    SELECT users.username, blog_posts.text_content
    FROM blog_posts LEFT JOIN users
    ON users.id = blog_posts.user_id
    ORDER BY users.id;
    `
  ).then(result => {
    const posts = result.rows;
    const postsList = posts.map(
      post => `
      <li>
        <p>${post.text_content}</p>
        <div>${post.username}</p>
      </li>
    `
    );
    res.status(200).send(`<ul>${postsList.join("")}</ul>`);
  });
}

module.exports = { home, newUser, createUser, allPosts };
