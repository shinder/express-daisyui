import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import moment from "moment-timezone";
import cors from "cors";
import { z } from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import "dotenv/config";
// import multer from "multer";

// const upload = multer({
//   dest: "uploads/", // 設定上傳檔案的儲存目錄
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 檔案大小限制，最大 5MB
//     files: 3, // 檔案數量限制，最多 3 個檔案
//   },
// });
import upload from "./utils/upload-images.js"; // 引入自訂的上傳中介軟體
import pool from "./utils/connect-mysql.js";
import admin2Router from "./routes/admin2.js";
import abRouter from "./routes/address-book.js";
import MySQLStore from "express-mysql-session";

// 建立 Session Store
const MySQLStoreClass = MySQLStore(session);
const sessionStore = new MySQLStoreClass({}, pool);

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));
const corsOptions = {
  credentials: true,
  origin: (origin, cb) => {
    // console.log({ origin });
    cb(null, true);
  },
};
app.use(cors(corsOptions));
// 全域中介軟體：處理 URL-encoded 表單資料
app.use(express.urlencoded({ extended: true }));
// 全域中介軟體：解析 application/json
app.use(express.json());

app.use(cookieParser()); // 全域中介軟體：解析 cookies
// 設定 session
app.use(
  session({
    // 新用戶沒有使用到 session 物件時不會建立 session 和發送 cookie
    saveUninitialized: false,
    resave: false, // 沒變更內容是否強制回存
    secret: "雜湊 session id 的字串",
    // cookie: {
    //   maxAge: 1200_000, // 20分鐘，單位毫秒
    // },
    store: sessionStore, // 使用 MySQL 作為 session 儲存
  })
);

// 記錄請求的中介軟體
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);

  if (req.body && Object.keys(req.body).length > 0) {
    console.log("主體內容：", req.body);
  }
  next();
};

// 全域使用自訂中介軟體
app.use(requestLogger);

// ************* 自訂的頂層 "中間件, 中介軟體" *************
app.use((req, res, next) => {
  res.locals.title = "小新的網站";
  res.locals.pageName = "";
  res.locals.session = req.session; // 讓所有的 EJS 可以用 session 變數
  res.locals.query = req.query;
  res.locals.cookies = req.cookies;

  const auth = req.get("Authorization");
  if (auth && auth.indexOf("Bearer ") === 0) {
    const token = auth.slice(7);
    try {
      req.my_jwt = jwt.verify(token, process.env.JWT_SECRET);
    } catch (ex) {}
  }
  next();
});

// 路由處理器
// 1. HTTP 方法, 2. URL
app.get("/", (req, res) => {
  res.locals.title = "首頁 - " + res.locals.title;
  res.render("home", { name: "Shinder" });
});

app.get("/sales-array", (req, res) => {
  res.locals.title = "Sales - " + res.locals.title;
  res.locals.pageName = "sales-array";
  const sales = [
    { name: "Bill", age: 28, id: "A001" },
    { name: "Peter", age: 32, id: "A002" },
    { name: "Carl", age: 29, id: "A003" },
  ];
  res.render("sales-array", { sales });
});

app.get("/try-qs", (req, res) => {
  // express@5 的行為和 express@4 的行為不同
  res.json(req.query);
});

app.get("/try-post-form", (req, res) => {
  res.render("try-post-form");
});

app.post("/try-post-form", (req, res) => {
  res.render("try-post-form", req.body);
});

app.post("/try-post", upload.none(), (req, res) => {
  res.json(req.body);
});

// 單一檔案上傳
app.post("/try-upload", upload.single("avatar"), (req, res) => {
  const { file, body } = req;
  console.log(file); // 上傳的文件信息
  console.log(body); // 其他表單文字欄位
  res.json({ file, body });
});
// 一個欄位上傳多個檔案
app.post("/try-uploads", upload.array("photos"), (req, res) => {
  res.json(req.files);
});

app.get("/params-1/:action/:id", (req, res) => {
  res.json(req.params);
});
// 路徑參數, 動態路由 (比較寬鬆的路由條件放後面)
app.get("/params-2/:action?/:id?", (req, res) => {
  res.json(req.params);
});

app.get("/params-3/:userId(\\d+)/profile", (req, res) => {
  res.json(req.params);
});

app.get(/^\/hi\/?/, (req, res) => {
  let result = {
    url: req.url,
  };
  result.split = req.url.split("/");
  res.json(result);
});

// 台灣手機號碼
app.get(/^\/m\/09\d{2}-?\d{3}-?\d{3}$/i, (req, res) => {
  let u = req.url.slice(3);
  u = u.split("?")[0];
  u = u.split("-").join("");
  res.json({ u });
});

app.use("/admins", admin2Router);
app.use("/address-book", abRouter);

// 設定 cookie 的路由
app.get("/my-set-cookie", (req, res) => {
  // 基本設定
  res.cookie("username", "shinder"); // 不設定過期時間，瀏覽器關閉時刪除

  // 完整選項設定
  res.cookie("userToken", "secure-token-123", {
    maxAge: 2 * 60 * 60 * 1000, // 2小時後過期
    // expires: new Date(Date.now() + 2 * 60 * 60 * 1000), // 或使用 expires
    httpOnly: true, // 防止 XSS 攻擊
    // secure: process.env.NODE_ENV === "production", // 生產環境使用 HTTPS
    sameSite: "strict", // 防止 CSRF 攻擊
    path: "/", // 整個網站都可存取
    // domain: ".example.com", // 指定域名
  });

  res.send("Cookie 已設定");
});

// 顯示 cookie 的路由
app.get("/my-get-cookie", (req, res) => {
  const username = req.cookies.username || "訪客";
  const userToken = req.cookies.userToken || "無效的 Token";
  res.json({ username, userToken });
});

app.get("/try-sess", (req, res) => {
  // req.session.my_num = req.session.my_num || 0;
  req.session.my_num ||= 0;
  req.session.my_num++;
  res.json(req.session);
});

app.get("/try-moment", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss";
  const m1 = moment(); // 取得當下時間的 moment 物件
  const m2 = moment("2024-02-29");
  const m3 = moment("2025-02-29");
  res.json({
    m1: m1.format(fm),
    m2: m2.format(fm),
    m3: m3.format(fm),
    m1v: m1.isValid(), // 是不是有效的日期
    m2v: m2.isValid(),
    m3v: m3.isValid(),
    m1z: m1.tz("Europe/London").format(fm),
    m2z: m2.tz("Europe/London").format(fm),
  });
});

app.get("/yahoo", async (req, res) => {
  const r = await fetch("https://tw.yahoo.com/");
  const txt = await r.text();
  res.send(txt);
});

// 測試資料庫連線
app.get("/try-db", async (req, res) => {
  const sql = "SELECT * FROM address_book LIMIT 3";

  // 第一個值為查詢的結果，第二個值為資料表欄位定義的相關資料
  const [rows, fields] = await pool.query(sql);
  res.json(rows);
});

app.get("/try-db2", async (req, res) => {
  const sql = `INSERT INTO address_book
    (name, email, mobile, address) VALUES (?, ?, ?, ?);`;
  // ? 是佔位符，會被後面的值替換，可以防止 SQL 注入攻擊
  const [result] = await pool.query(sql, [
    "小新",
    "shinder@test.com",
    "0912345678",
    "台北市信義區",
  ]);
  res.json(result);
});

// http://localhost:3001/try-zod?account=aaabbb&password=123456
app.get("/try-zod", async (req, res) => {
  const schema = z.object({
    account: z.string({ message: "必填" }).min(5, { message: "至少五個字元" }),
    password: z.string().min(6).max(10),
  });

  res.json(schema.safeParse(req.query));
});

/*
app.use(express.static("build"));
app.get("*", (req, res)=>{
  res.send(`<!doctype html><html lang="zh"><head><meta charset="utf-8"/><link rel="icon" href="/favicon.ico"/><meta name="viewport" content="width=device-width,initial-scale=1"/><meta name="theme-color" content="#000000"/><meta name="description" content="Shinder react hooks"/><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.3/dist/css/bootstrap.min.css"/><title>Shinder react hooks</title><script defer="defer" src="/static/js/main.6a205622.js"></script></head><body><noscript>You need to enable JavaScript to run this app.</noscript><div id="root"></div></body></html>`)
})
  */
app.get("/bcrypt1", async (req, res) => {
  const pw = "123456";
  const hash = await bcrypt.hash(pw, 10); // 取得 hash
  res.send(hash);
});
app.get("/bcrypt2", async (req, res) => {
  const pw = "123456";
  const hash = "$2b$10$.tCwSbb0Hc8TP/GGzE.3H.TmXzVPu9Df7vy7QlZj4OnmIZzSTP.ci";
  const result = await bcrypt.compare(pw, hash); // 比對
  res.send({ result });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
app.get("/login", (req, res) => {
  res.locals.pageName = "login";
  res.render("login");
});
app.post("/login", upload.none(), async (req, res) => {
  const { email, password } = req.body;
  const zodResult = loginSchema.safeParse({ email, password });
  if (!zodResult.success) {
    return res.status(400).json({ success: false });
  }

  const sql = "SELECT * FROM members WHERE email=?";
  const [rows] = await pool.query(sql, [email]);
  if (!rows.length) {
    // 帳號是錯的
    return res.status(404).json({ success: false, code: 12 });
  }
  if (!(await bcrypt.compare(password, rows[0].password_hash))) {
    // 密碼是錯的
    return res.status(404).json({ success: false, code: 34 });
  }
  req.session.admin = {
    id: rows[0].member_id,
    email,
    nickname: rows[0].nickname,
  };
  res.json({ success: true });
});
app.get("/logout", (req, res) => {
  // req.get(): 取得用戶端送過來的 Header
  const goBack = req.get("Referer") || "/";
  delete req.session.admin;
  req.session.save((error) => {
    res.redirect(goBack);
  });
});
app.get("/jwt01", async (req, res) => {
  // 加密資料
  const token = jwt.sign({ name: "shinder" }, process.env.JWT_SECRET);
  res.send(token);
});
app.get("/jwt02", async (req, res) => {
  // 解密資料
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoic2hpbmRlciIsImlhdCI6MTc1MTk1MjcwOH0.5GOKj-DSOgHABYYvHc0vsGFvmRPduwBH1MAHiGSwE8U";

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    res.json(payload);
  } catch (ex) {
    res.send("無效的 JWT");
  }
});
app.post("/login-jwt", upload.none(), async (req, res) => {
  const { email, password } = req.body;
  const zodResult = loginSchema.safeParse({ email, password });
  if (!zodResult.success) {
    return res.status(400).json({ success: false });
  }

  const sql = "SELECT * FROM members WHERE email=?";
  const [rows] = await pool.query(sql, [email]);
  if (!rows.length) {
    // 帳號是錯的
    return res.status(404).json({ success: false, code: 12 });
  }
  if (!(await bcrypt.compare(password, rows[0].password_hash))) {
    // 密碼是錯的
    return res.status(404).json({ success: false, code: 34 });
  }
  // 要打包進 token 的資料
  const payload = {
    id: rows[0].member_id,
    email,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET);
  res.json({
    success: true,
    token,
    id: rows[0].member_id,
    email,
    nickname: rows[0].nickname,
  });
});
app.get("/jwt-data", (req, res) => {
  res.json(req.my_jwt);
});

// ********** 404 此段放在所有路由設定的後面 **********
app.use((req, res) => {
  res.status(404).send(`<h1>404 - 頁面不存在</h1>
    <div><img src="/imgs/404.webp" width="300" /></div>
    `);
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`Express 伺服器已啟動，監聽埠號 ${port}`);
  console.log(`請打開瀏覽器訪問 http://localhost:${port}`);
});
