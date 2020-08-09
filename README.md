# Learn database testing

Learn how to set up a test database and make sure your queries work.

## Setup

You need an existing database to connect to. Ideally complete this [Postgres & Node workshop](https://github.com/oliverjam/learn-node-postgres) first. It contains instructions on creating a database and user.

1. Clone this repo
1. Add a `.env` file with an environment variable pointing to your existing database. For example:
   ```sh
   DATABASE_URL='postgres://myuser:mypassword@localhost:5432/learn_node_postgres'
   ```

## Database build script

Right now our local code always talks to the same database running on our machine. This is a problem for automated tests, since if a test changes the database this may affect the result of other tests.

E.g. if we test our "add a user" functionality the database will gain a new user. If we then test "list all users" we would have one extra user each time the tests ran.

It's better to reset everything before each test, so all tests are totally independent from each other and consistent. Let's write a JavaScript function that rebuilds our database using the `init.sql` file.

Create a `workshop/database/build.js` file. We can import our database pool object so we can make queries, and use Node's `fs` module to read the contents of our SQL file.

```js
const fs = require("fs");
const path = require("path");
const db = require("./connection");

const initPath = path.join(__dirname, "init.sql");
const initSQL = fs.readFileSync(initPath, "utf-8");
```

Then we can write a function that uses the pool object to run all SQL for building our database tables:

```js
function build() {
  return db.query(initSQL);
}

module.exports = build;
```

Now we can import this function in our tests and use it to reset our database before each one.

**Important: do not run this in production: it will delete all your users' data.**

## Creating a separate test database

It's not a good idea to run tests against our development database. Since we're resetting the data before each test we'll keep losing any data we add in the course of development.

Instead let's create a separate test database owned by the same user. Type `psql` to enter the Postgres CLI, then run this command:

```sql
CREATE DATABASE test_node_postgres WITH OWNER myuser;
```

We don't need to worry about initialising the test database with data since our build script will do that before each test.

However we do need to make sure `node-postgres` connects to this different database when our tests are running. First add this new database to your `.env` file so our code can use the URL:

```sh
DATABASE_URL='postgres://myuser:mypassword@localhost:5432/learn_node_postgres'
TEST_DATABASE_URL='postgres://myuser:mypassword@localhost:5432/test_node_postgres'
```

Now we need our code to pick the right URL based on whether we're running tests or not. It's common practice to set an environment variable called `NODE_ENV` for this.

Create a new entry in the `"scripts"` object of your `package.json`:

```json
{
  "scripts": {
    "test": "NODE_ENV=test tape 'workshop/tests/*' | tap-spec"
  }
}
```

This will let us know whether we're running tests or the normal server. We're also using a ["glob"](https://en.wikipedia.org/wiki/Glob_%28programming%29) (the `*`) to run Tape against any file in the `workshop/tests/` directory.

<details>
<summary>If you're using Windows</summary>

Setting environment variables like this will probably fail on Windows. Use the [`cross-env`](https://github.com/kentcdodds/cross-env) library for cross-platform support:

```json
{
  "scripts": {
    "test": "cross-env NODE_ENV=test tape 'workshop/tests/*' | tap-spec"
  }
}
```

</details>

We now need to tell our database connection code to switch databases while tests are running. Edit your `connection.js` to do this:

```js
let connectionString = process.env.DATABASE_URL;

if (process.env.NODE_ENV === "test") {
  connectionString = process.env.TEST_DATABASE_URL;
}
```

You'll also need to run `npm install -D tape tap-spec` to install your testing dependencies.

## Modularising database queries

Currently we're querying our database from within our handler functions. This makes it hard to test the queries in isolation. We _could_ write a `supertest` test for the entire router, but that's overkill when you just care about testing your data logic.

Extracting our queries to another file or directory will make testing much easier. Create a `workshop/model.js` file. We can then move the database queries from our handlers into this file.

Create a function named `getUsers`. Import your database pool object and use it to get all the users.:

```js
const db = require("./database/connection");

function getUsers() {
  return db.query("SELECT * FROM users").then((result) => result.rows);
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

Finally extract the query from the `allPosts` handler and export that.

Now we can refactor our handlers to use the new `model` functions. Import your model object and use them in place of the existing queries in your handlers.

For example:

```js
const model = require("./model");

function home(request, response) {
  model.getUsers().then((users) => {
    const userList = users.map((user) => `<li>${user.username}</li>`);
    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<ul>${userList.join("")}</ul>`);
  });
}
```

Run your server with `npm run dev` to ensure your handlers still work.

## Testing our model

Now we have everything set up to test our database queries. Create a `workshop/tests/model.test.js` file. Import `tape`, your database build script, and your model functions, then write your first test:

```js
const test = require("tape");
const build = require("../database/build");
const { getUsers, createUser, getPosts } = require("../model");

test("Can get all users", (t) => {
  // test goes here
});
```

Remember we want to reset our database at the start of each test so we know exactly what data we're working with. The `build` function is running a database query, which means it's asynchronous and so returns a promise. We need to use `.then` to only run our test once the build succeeds:

```js
test("Can get all users", (t) => {
  build().then(() => {
    // now we can test the freshly built data
  });
});
```

Since we know what data the database is initialised with (the stuff inside `init.sql`) we can make assertions about what data should be returned.

```js
test("Can get all users", (t) => {
  build().then(() => {
    getUsers().then((users) => {
      const firstUser = users[0];
      t.equal(firstUser.username, "Sery1976");
      t.equal(firstUser.age, 28);
      t.end();
    });
  });
});
```

Run `npm test` to check this passed. Then we should also make sure the test fails if the promise rejects:

```js
test("Can get all users", (t) => {
  build().then(() => {
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
  });
});
```

You can make the test fail by breaking your query in `model.js`. Change `"SELECT * FROM users"` to `"SEL * FROM users"`. Your test should now fail with `[error: syntax error at or near "SEL"]`.

### Insertions

Since our `createPosts` model function doesn't return anything we need to make an additional query to make sure the data was added correctly:

```js
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
```

Here we insert a new user, then query for all the users and check that our new user is present.

Write your own test for the `getPosts` model function. Make sure that the result contains the correct username for each post.

## Stretch: router tests

Install `supertest` and use it to write tests for each route. Since your handlers access the database you'll need to use your `build` function to reset the data before each.

## Tests hanging

You may find your tests pass, then wait for 10 seconds. This is because the database pool stays open waiting for more requests. This behaviour is desirable on the server as it improves performance, but a bit annoying here. You can import your pool object and then call its `.end()` method to close all the pool connections at the end of your final test if you want to fix this.
