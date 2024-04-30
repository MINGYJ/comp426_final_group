//#!/usr/bin/env node
import minimist from "minimist";
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { db, start } from "./db.mjs";
import crypto from "crypto";
import session from "express-session";

const app = express();
app.set("trust proxy", 1); // trust first proxy
app.use(
  session({
    name: `daffyduck`,
    secret: "some-secret-example",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // This will only work if you have https enabled!
      maxAge: 60000, // 1 min
    },
  })
);

//session validation checker,check if current session is login
var sessionChecker = (req, res, next) => {
  console.log(`Session Checker: ${req.session.id}`.green);
  console.log(req.session);
  if (req.session.profile) {
    console.log(`Found User Session`.green);
    next();
  } else {
    console.log(`No User Session Found`.red);
    res.redirect("/login-screen");
  }
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// import path from 'path';
const __dirname = path.resolve();

// get the view engine by ReAct
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "..", "views")));

const args = minimist(process.argv.slice(2));
var port = 5005;
if (args.port) {
  port = args.port;
}

app.get("/", async (req, res) => {
  req.session.destroy(function (err) {
    console.log("Destroyed session");
  });
  res.render("index");
});

app.get("/login-screen", async (req, res) => {
  req.session.destroy(function (err) {
    console.log("Destroyed session");
  });
  res.render("login-screen");
});

app.post("/login-screen", async (req, res) => {
  const { username, password } = req.body;
  console.log("USER LOGIN ATTEMPT", username,"and",password);

  let passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  console.log("password:",passwordHash);
  let row = await db.get(
    `SELECT * FROM users WHERE username='${username}' and password= '${passwordHash}';`
  );
  console.log("row",row);
  if (row === undefined) {
    console.log("Unsuccessful try:", req.app.get("username"));
    res.redirect("/login-screen");
    return;
  } else {
    //successfully login
    req.session.profile = row;
    res.redirect("/user-screen");
    return;
  }
});

app.get("/user-creation-screen", async (req, res) => {
  // const db = await dbPromise;
  res.render("user-creation-screen");
});

app.post("/user-creation-screen", async (req, res) => {
  const { username, password , calGoal} = req.body;
  let cal_Goal;
  if (calGoal==""){
    cal_Goal=2000;
  }else{
    cal_Goal=parseInt(calGoal);
  }
  //need to check if username already exist
  console.log("USER CREATION ATTEMPT", username);
  if (username === "" || password === "") {
    res.json({ code: -1, message: "Please Enter correct name and password!" });
    // res.send(
    //   `<script>

    //     alert("Please Enter correct name and password!"); window.location.href = "/user-creation-screen"; 
    //   </script>`
    // );
    //res.redirect("/login-screen");
    return;
  }
  let exist_check = await db.get(
    `SELECT * FROM users WHERE username='${username}';`
  );
  if (exist_check !== undefined) {
    // res.send(
    //   `<script>alert("User exist, please login!"); window.location.href = "/user-creation-screen"; </script>`
    // );
    return res.json({ code: -1, message: "User exist, please login!" });
  }
  const passwordHash = crypto.createHash("sha256").update(password).digest("hex");
  await db.run(
    "INSERT INTO users (username,password,cal) VALUES (?, ?, ?)",
    username,
    passwordHash,
    cal_Goal
  );
  // res.send(
  //   `<script>alert("Successfully add new account"); window.location.href = "/login-screen"; </script>`
  // );
  return res.json({ code: 200, message: "Successfully add new account" });
  //res.redirect("/login-screen");
});

app.get("/index", async (req, res) => {
  // const db = await dbPromise;
  res.render("index");
});

app.get("/user-screen", sessionChecker, async (req, res) => {
  // const db = await dbPromise;
  // 查询数据库中 User表的数据

  // 根据 username 查询 Exercise
  // 查询数据库中 Exercise表的数据

  try {
    let loginUsername = req.session.profile.username;
    const users = await db.all("SELECT * FROM Exercise WHERE username = ?", [
      loginUsername,
    ]);
    let cal_burn=await db.get("SELECT SUM(burned) as total FROM Exercise WHERE username = ?",loginUsername);
    cal_burn=cal_burn.total;
    let cal_need=await db.get("SELECT cal FROM users WHERE username = ?",loginUsername);
    cal_need=cal_need.cal-cal_burn;
    console.log(users);
    res.render("user-screen", { users, cal_need });
  } catch (e) {
    console.log(e);
    res.redirect("index");
  }
});

app.post("/user-screen", sessionChecker, async (req, res) => {
  console.log("Session username:", req.session.profile.username);
  let loginUsername = req.session.profile.username;
  const { name, type, burned } = req.body;
  /**
   * CREATE TABLE Exercise (
    id INTEGER PRIMARY KEY,
    name STRING,
    type STRING,
    burned STRING,
    username STRING,
);

   */
  // 写入表 Exercise
  try {
    await db.run(
      "INSERT INTO Exercise (name, type, burned, username) VALUES (?, ?, ?, ?)",
      name,
      type,
      burned,
      loginUsername
    );
    res.redirect("user-screen");
  } catch (e) {
    console.log(e);
    res.redirect("index");
  }
});

app.post("/user-screen", async (req, res) => {
  res.render("index");
});

app.get("*", (req, res) => {
  res.status(404).send("404 NOT FOUND");
});

const setup = async () => {
  await start(db);
  app.listen(port, () => {
    console.log("listening at http://localhost:" + port);
  });
};
setup();
