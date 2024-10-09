const express = require("express");
const app = express();
const cors = require("cors");
const User = require("./models/User");
const Post = require("./models/Post");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookirparser = require("cookie-parser");
const multer = require("multer");
const uploadmiddlware = multer({ dest: "upload/" });
const fs = require("fs");
const { assert } = require("console");

const salt = bcrypt.genSaltSync(10);
const secret = "sasdasd";

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(cookirparser());
app.use("/upload", express.static(__dirname + "/upload"));
mongoose.connect(
  "mongodb+srv://pateldhyey649:Fyd8kFl9PNW6wMcm@blog.fcut6.mongodb.net/"
);

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const userDoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json(userDoc);
  } catch (e) {
    // throw e;
    res.status(400).json(e);
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userDoc = await User.findOne({ username });
  const passok = bcrypt.compareSync(password, userDoc.password);
  if (passok) {
    await jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({ id: userDoc._id, username });
      // console.log("token");
    });
  } else {
    res.status(400).json("Wrong Credentials");
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadmiddlware.single("file"), async (req, res) => {
  const { originalname } = req.file;
  const { path } = req.file;
  const parts = originalname.split(".");
  // console.log(parts[0]);
  const ext = parts[parts.length - 1];
  const newpath = path + "." + ext;

  fs.renameSync(path, newpath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    // res.json(info);
    const { title, summery, content } = req.body;
    const PostDoc = await Post.create({
      title,
      summery,
      content,
      cover: newpath,
      author: info.id,
    });
    res.json(PostDoc);
  });
});

app.put("/post", uploadmiddlware.single("file"), async (req, res) => {
  const newpath = null;
  if (req.file) {
    const { originalname } = req.file;
    const { path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newpath = path + "." + ext;
    fs.renameSync(path, newpath);
  }
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;

    const { id, title, summery, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuth = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuth) {
      return res.status(400).json("You are not author");
    }

    postDoc.title = title;
    postDoc.summery = summery;
    postDoc.content = content;
    postDoc.cover = newpath ? newpath : postDoc.cover;
    await postDoc.save();
    res.json(postDoc);
  });
});

app.get("/post", async (req, res) => {
  res.json(
    await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20)
  );
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.listen(4000);

// pateldhyey649
// Fyd8kFl9PNW6wMcm

// mongodb+srv://pateldhyey649:Fyd8kFl9PNW6wMcm@blog.fcut6.mongodb.net/?retryWrites=true&w=majority&appName=Blog
