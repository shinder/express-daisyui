import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import moment from "moment-timezone";
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
import MySQLStore from 'express-mysql-session';

// 建立 Session Store
const MySQLStoreClass = MySQLStore(session);
const sessionStore = new MySQLStoreClass({}, pool);

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));
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

// 基本路由
app.get("/", (req, res) => {
  res.render("home", { name: "Shinder" });
});

app.get("/sales-array", (req, res) => {
  const sales = [
    { name: "Bill", age: 28, id: "A001" },
    { name: "Peter", age: 32, id: "A002" },
    { name: "Carl", age: 29, id: "A003" },
  ];
  res.render("sales-array", { sales });
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

// 404 處理（必須放在所有路由之後）
app.use((req, res) => {
  res.status(404).send("<h1>404 - 頁面不存在</h1>");
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`Express 伺服器已啟動，監聽埠號 ${port}`);
  console.log(`請打開瀏覽器訪問 http://localhost:${port}`);
});
