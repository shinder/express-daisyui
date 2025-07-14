import express from "express";
import cookieParser from "cookie-parser";
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
import admin2Router from "./routes/admin2.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));
// 全域中介軟體：處理 URL-encoded 表單資料
app.use(express.urlencoded({ extended: true }));
// 全域中介軟體：解析 application/json
app.use(express.json());

app.use(cookieParser()); // 全域中介軟體：解析 cookies

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

// 404 處理（必須放在所有路由之後）
app.use((req, res) => {
  res.status(404).send("<h1>404 - 頁面不存在</h1>");
});

// 啟動伺服器
app.listen(port, () => {
  console.log(`Express 伺服器已啟動，監聽埠號 ${port}`);
  console.log(`請打開瀏覽器訪問 http://localhost:${port}`);
});
