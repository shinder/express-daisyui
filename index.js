import express from "express";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(express.static("public"));

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

app.get("/about", (req, res) => {
  res.send("<h1>關於我們</h1><p>這是使用 Express 和 ESM 的範例。</p>");
});

// JSON API 路由
app.get("/api/info", (req, res) => {
  res.json({
    name: "My Express App",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
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
