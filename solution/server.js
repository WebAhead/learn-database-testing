const express = require("express");
const router = require("./router");
const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.urlencoded({ extended: false }))
app.use(router)

app.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
});
