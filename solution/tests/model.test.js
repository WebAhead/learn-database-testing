const test = require("tape");
const db = require("../database/connection");
const build = require("../database/build");
const { getUsers, createUser, getPosts } = require("../model");

test("Can get all users", t => {
  build().then(() => {
    getUsers()
      .then(users => {
        const firstUser = users[0];
        t.equal(firstUser.username, "Sery1976");
        t.equal(firstUser.age, 28);
      })
      .catch(error => {
        t.error(error);
      })
      .finally(() => {
        t.end();
        // db.end();
      });
  });
});

test("Can create a new user", t => {
  build().then(() => {
    const data = { username: "oli", age: 29, location: "London" };
    createUser(data)
      .then(getUsers)
      .then(users => {
        const latestUser = users[users.length - 1];
        t.equal(latestUser.username, "oli");
        t.end();
      })
      .catch(error => {
        t.error(error);
        t.end();
      });
  });
});
