//express, importing server side Framework//
const express = require("express");
const path = require("path");

const app = express();
app.use(express.json());
const cors = require("cors");
app.use(cors());

const { open } = require("sqlite"); //open is a method to connect to database in sqlite//
const sqlite3 = require("sqlite3"); //driver//

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "financepeer.db"); //Gives the path to db//

let db = null;

//Initializing database and Server//

const initializeDBandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DataBase Connection Error occurred: ${e.message}`);
    process.exit(1); //Stop the process if any error occurs//
  }
};
initializeDBandServer();

/*Middleware function to verify a user is a valid and has the rights to perform actions */
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

/*register new user API*/
app.post("/register", async (request, response) => {
  const { username, name, password } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10); // Hashing Password//
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}'
        );`;
    const dbResponse = await db.run(createUserQuery);
    response.send("Successful!! Login Now");
  } else {
    response.status = 400;
    response.send("User already exists");
  }
});

/*Login API */
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid User");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.send("Login Success!!");
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

app.get("/stories", authenticateToken, async (request, response) => {
  const storiesQuery = `SELECT * FROM story;`;
  const stories = await db.all(storiesQuery);
  response.send(stories);
});

module.exports = app;
