const model = require("./model");

function home(req, res) {
  model.getUsers().then(users => {
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
  model
    .createUser(data)
    .then(() => {
      res.redirect('/');
    })
    .catch(error => {
      console.log(error);
      res.status(500).send(`<h1>Something went wrong saving your data</h1>`);
    });
}

function allPosts(req, res) {
  model.getPosts().then(posts => {
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
