const model = require("./model");

function home(request, response) {
  model.getUsers().then(users => {
    // create a list item for each user in the array
    const userList = users.map(user => `<li>${user.username}</li>`);
    response.writeHead(200, { "content-type": "text/html" });
    // use .join to turn the array into a string
    response.end(`<ul>${userList.join("")}</ul>`);
  });
}

function newUser(request, response) {
  response.writeHead(200, { "content-type": "text/html" });
  response.end(`
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

function createUser(request, response) {
  let body = "";
  request.on("data", chunk => (body += chunk));
  request.on("end", () => {
    const searchParams = new URLSearchParams(body);
    const data = Object.fromEntries(searchParams);
    model
      .createUser(data)
      .then(() => {
        response.writeHead(302, { location: "/" });
        response.end();
      })
      .catch(error => {
        console.log(error);
        response.writeHead(500, { "content-type": "text/html" });
        response.end(`<h1>Something went wrong saving your data</h1>`);
      });
  });
}

function allPosts(request, response) {
  model.getPosts().then(posts => {
    const postsList = posts.map(
      post => `
      <li>
        <p>${post.text_content}</p>
        <div>${post.username}</p>
      </li>
    `
    );
    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<ul>${postsList.join("")}</ul>`);
  });
}

module.exports = { home, newUser, createUser, allPosts };
