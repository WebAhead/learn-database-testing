const test = require("tape");
const build = require("../database/build");
const { getUsers, createUser, getPosts } = require("../model");
const db = require("../database/connection");

test("Can get all users", (t) => {
  build()
    .then(() => {
      getUsers()
        .then((users) => {
          const firstUser = users[0];
          t.equal(firstUser.username, "Sery1976");
          t.equal(firstUser.age, 28);
          t.end();
        })
        .catch((error) => {
          t.error(error);
          t.end();
        });
    })
    .catch((buildError) => {
      t.error(buildError);
      t.end();
    });
});

test("Can create a new user", (t) => {
  build().then(() => {
    const data = { username: "oli", age: 29, location: "London" };
    createUser(data)
      .then(getUsers)
      .then((users) => {
        const latestUser = users[users.length - 1];
        t.equal(latestUser.username, "oli");
        t.end();
      })
      .catch((error) => {
        t.error(error);
        t.end();
      });
  });
});

test("Can get posts with authors", (t) => {
  build().then(() => {
    getPosts()
      .then((posts) => {
        const firstPost = posts[0];
        t.equal(firstPost.username, "Sery1976");
        t.equal(
          firstPost.text_content,
          "Announcing of invitation principles in."
        );
        t.end();
      })
      .catch((error) => {
        t.error(error);
        t.end();
      });
  });
});

test("Close DB pool (not a real test)", (t) => {
  // otherwise tests will pause for 10s in the terminal
  db.end();
  t.end();
});
