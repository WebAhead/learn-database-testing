const express = require('express');
const router = express.Router();
const handlers = require("./handlers");

router.get('/', handlers.home)
router.get('/new-user', handlers.newUser)
router.post('/createUser', handlers.createUser)
router.get('/all-posts', handlers.allPosts)
router.use((req, res) => {
  res.status(404).send(`<h1>Not found</h1>`)
})

module.exports = router;
