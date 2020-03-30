# Learn database testing

Learn how to set up a test database and make sure your queries work.

## Setup

We'll be building on an existing database and server, so make sure you've completed this [Postgres & Node workshop](https://github.com/oliverjam/learn-node-postgres) first. You can either add tests to the previous workshop or clone this repo and start fresh. Just make sure you have an existing database.

If you are cloning this repo make sure you add a `.env` file with your Postgres environment variables to point to your existing database. For example:

```sh
PGDATABASE=blog_posts
PGUSER=myuser
PGPASSWORD=mypassword
```

## Database build script

Tests should not influence each other. This is a problem when testing databases because the whole point is to _persist_ data. So in order for each test to run in isolation we should reset the database before reach one. Let's write a function that rebuilds our database using the `init.sql` file.

Create a `workshop/database/build.js` file. We can import our database pool object so we can make queries, and use Node's `fs` module to read the contents of our SQL file.

```js
const fs = require("fs");
const path = require("path");
const db = require("./connection");

const initPath = path.join(__dirname, "init.sql");
const initSQL = fs.readFileSync(initPath, "utf-8");
```

Then we can write a function that uses the pool object to run the SQL query against the database:

```js
function build() {
  return db.query(initSQL);
}

module.exports = build;
```

We can import this function in our tests and use it to reset our database before each test.

**Important: do not run this in production: it will delete all your users' data.**

## Creating a separate test database

It's not a good idea to run tests against our development database. Since we're resetting the data before each test we'll lose anything we've added in the course of development.

Instead let's create a separate test database in our terminal:

```sh
psql -c CREATE DATABASE test_blog_workshop
```

We can re-use the same user, since this is just for testing. We just need to give that user permission to access this new database. Replace `myuser` in the following script with the user you created for your `blog_workshop` database.

```sh
psql -c GRANT ALL PRIVILEGES ON DATABASE test_blog_workshop TO myuser
```

We don't need to worry about initialising the test database with data since our build script will do that before each test. However we do need to make sure `node-postgres` connects to this different database when our tests are running. We can do that by setting a different `PGDATABASE` environment variable in our test npm script.

Create a new entry in the `"scripts"` object of your `package.json`:

```json
{
  "scripts": {
    "test": "PGDATABASE=test_blog_workshop tape 'workshop/tests/*' | tap-spec"
  }
}
```

This overrides the name of the database to use while our tests are running. We're also using a ["glob"](https://en.wikipedia.org/wiki/Glob_%28programming%29) (the `*`) to run Tape against any file in the `workshop/tests/` directory.

<details>
<summary>If you're using Windows</summary>

Setting environment variables like this will probably fail on Windows. Use the [`cross-env`](https://github.com/kentcdodds/cross-env) library for cross-platform support:

```json
{
  "scripts": {
    "test": "cross-env PGDATABASE=test_blog_workshop tape 'workshop/tests/*' | tap-spec"
  }
}
```

</details>

You'll also need to run `npm install tape tap-spec` to install your testing dependencies.

## Modularising database queries

Currently we're querying our database from within our handler functions. This makes it hard to test the queries in isolation. We _could_ write a `supertest` test for the entire router, but that's overkill when you just care about testing your data logic.

Extracting our queries to another file or directory will make testing much easier. Create a `workshop/model.js` file. We can then move the database queries from our handlers into this file.

Create a function named `getUsers`. Import your database pool object and use it to get all the users.:

```js
const db = require("./database/connection");

function getUsers() {
  return db.query("SELECT * FROM users").then(result => result.rows);
}

module.exports = { getUsers };
```

We can include any data-related logic here. For example our handler only cares about the actual data, not the rest of the query result, so we can return just the `rows` array.

Create another function named `createUser`. This should take a new user object as an argument and insert it into the database (don't forget to export it).

```js
function createUser(data) {
  const values = [data.username, data.age, data.location];
  return db.query(
    "INSERT INTO users(username, age, location) VALUES($1, $2, $3)",
    values
  );
}

module.exports = { getUsers, createUser };
```

Finally extract the query from the `allPosts` handler and export that. Now we can refactor our handlers to use the new `model` functions. Import your model object and use them in place of the existing queries in your handlers.

```js
const model = require("./model");

function home(request, response) {
  model.getUsers().then(users => {
    const userList = users.map(user => `<li>${user.username}</li>`);
    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<ul>${userList.join("")}</ul>`);
  });
}
```

Run your server with `npm run dev` to ensure your handlers still work.

## Testing our model

Now we have everything set up to test our database queries. Create a `workshop/tests/model.test.js` file. Import `tape`, your database build script, and your model functions, then write your first test:

```js
const test = require("test");
const build = require("../database/build");
const { getUsers, createUser, getPosts } = require("../model");

test("Can get all users", t => {
  // test goes here
});
```

Remember we want to reset our database at the start of each test so we know exactly what data we're working with:

```js
test("Can get all users", t => {
  build().then(() => {
    // now we can test the fresh data
  });
});
```

Since we know what data the database is initialised with (the stuff inside `init.sql`) we can make assertions about what data should be returned.

```js
test("Can get all users", t => {
  build().then(() => {
    getUsers().then(users => {
      const firstUser = users[0];
      t.equal(firstUser.username, "Sery1976");
      t.equal(firstUser.age, "28");
      t.end();
    });
  });
});
```

We should also add a test to handle errors:

```js
test("Can get all users", t => {
  build().then(() => {
    getUsers()
      .then(users => {
        const firstUser = users[0];
        t.equal(firstUser.username, "Sery1976");
        t.equal(firstUser.age, "28");
        t.end();
      })
      .catch(error => {
        t.error(error);
        t.end();
      });
  });
});
```

You can make the test fail by breaking your query in `model.js`. Change `"SELECT * FROM users"` to `"SEL * FROM users"`. Your test should now fail with `[error: syntax error at or near "SEL"]`.

### Insertions

Since our `createPosts` model function doesn't return anything we need to make an additional query to make sure the data was added correctly:

```js
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
```

Here we insert a new user, then query for all the users and check that our new user is present.

Write your own test for the `getPosts` model function. Make sure that the result contains the correct username for each post.

## Stretch: router tests

Install `supertest` and use it to write tests for each route. Since your handlers access the database you'll need to use your `build` function to reset the data before each.

## Tests hanging

You may find your tests pass, then wait for 10 seconds. This is because the database pool stays open waiting for more requests. This behaviour is desirable on the server as it improves performance, but a bit annoying here. You can import your pool object and then call its `.end()` method to close all the pool connections at the end of your final test if you want to fix this.
