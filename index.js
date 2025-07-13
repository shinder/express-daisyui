import express from "express";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));
// 全域中介軟體：處理 URL-encoded 表單資料
app.use(express.urlencoded({ extended: true }));
// 全域中介軟體：解析 application/json
app.use(express.json());

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

app.post("/try-post", (req, res) => {
  res.json(req.body);
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
