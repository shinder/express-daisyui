import express from "express";
import moment from "moment-timezone";
import { z } from "zod";
import pool from "../utils/connect-mysql.js";
import upload from "../utils/upload-images.js";

const router = express.Router();

const abItemSchema = z.object({
  name: z
    .string({ message: "姓名為必填欄位" })
    .min(2, { message: "姓名至少兩個字" }),
  email: z
    .string({ message: "電郵為必填欄位" })
    .email({ message: "格式必須為電郵格式" }),
  birthday: z
    .string()
    .date("日期格式: YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
});

const orderByMapping = {
  id_asc: " ORDER BY ab_id ",
  id_desc: " ORDER BY ab_id DESC ",
  birth_asc: " ORDER BY birthday ",
  birth_desc: " ORDER BY birthday DESC ",
  mobile_asc: " ORDER BY mobile ",
  mobile_desc: " ORDER BY mobile DESC ",
};

const getListData = async (req) => {
  const perPage = 20; // 每頁最多有幾筆
  // 回傳的物件
  let output = {
    success: false,
    redirect: "",
    totalRows: 0,
    totalPages: 0,
    page: 0,
    perPage,
    rows: [],
  };

  const page = +req.query.page || 1; // 預設值為 1
  if (page < 1) {
    output.redirect = `?page=1`; // 有設定表示要跳轉頁面
    return output;
  }

  const keyword = req.query.keyword || "";
  const birth_begin = req.query.birth_begin || "";
  const birth_end = req.query.birth_end || "";
  const orderby = req.query.orderby || "";

  let sqlWhere = " WHERE 1 ";

  if (keyword) {
    const keywordEsc = pool.escape(`%${keyword}%`); // 避免 SQL injection
    sqlWhere += ` AND ( ab.name LIKE ${keywordEsc} OR ab.mobile LIKE ${keywordEsc} ) `;
  }
  if (birth_begin) {
    const m = moment(birth_begin);
    if (m.isValid()) {
      const mStr = m.format("YYYY-MM-DD");
      sqlWhere += ` AND ab.birthday >= '${mStr}' `;
    }
  }
  if (birth_end) {
    const m = moment(birth_end);
    if (m.isValid()) {
      const mStr = m.format("YYYY-MM-DD");
      sqlWhere += ` AND ab.birthday <= '${mStr}' `;
    }
  }

  let orderByFrag = orderByMapping[orderby] || " ORDER BY ab.ab_id DESC ";

  // 預設為 0, 若用戶沒登入就使用 0
  let member_id = 0;
  if (req.session.admin?.id) {
    member_id = req.session.admin?.id; // 若有登入, 使用會員編號
  } else if (req.my_jwt?.id) {
    member_id = req.my_jwt?.id;
  }

  const t_sql = `SELECT COUNT(1) totalRows FROM address_book ab ${sqlWhere}`;
  const [[{ totalRows }]] = await pool.query(t_sql); // 多重解構
  let totalPages = 0; // 預設值
  let rows = [];
  // 有資料才做
  if (totalRows > 0) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      output.redirect = `?page=${totalPages}`; // 有設定表示要跳轉頁面
      return output;
    }
    /*
      SELECT ab.*, li.like_id FROM address_book ab
        LEFT JOIN (
          SELECT like_id, ab_id FROM ab_likes WHERE member_id=3
          ) li
        ON ab.ab_id=li.ab_id 
        ORDER BY ab.ab_id DESC;
    */
    const sql = `SELECT ab.*, li.like_id FROM address_book ab 
                  LEFT JOIN (
                    SELECT like_id, ab_id FROM ab_likes WHERE member_id=${member_id}
                    ) li
                  ON ab.ab_id=li.ab_id
    ${sqlWhere} ${orderByFrag} LIMIT ${(page - 1) * perPage}, ${perPage}`;
    [rows] = await pool.query(sql);
    rows.forEach((v) => {
      const m = moment(v.birthday);
      if (m.isValid()) {
        v.birthday = m.format("YYYY-MM-DD");
      } else {
        v.birthday = "";
      }
    });
  }
  output = { ...output, success: true, page, totalRows, totalPages, rows };
  return output;
};

// 取得單筆資料的 function
const getItemData = async (req) => {
  const output = {
    success: false,
    data: {},
    code: 0,
    message: "",
  };
  const ab_id = +req.params.ab_id || 0;
  if (!ab_id) {
    return { ...output, code: 400, message: "錯誤的編號" };
  }
  // 讀取資料
  const sql = "SELECT * FROM address_book WHERE ab_id=?";
  const [rows] = await pool.query(sql, [ab_id]);
  if (rows.length === 0) {
    return { ...output, code: 404, message: "沒有該筆資料" };
  }
  const m = moment(rows[0].birthday);
  rows[0].birthday = m.isValid() ? m.format("YYYY-MM-DD") : "";

  return { ...output, code: 200, success: true, data: rows[0] };
};
/*
// 沒有使用 jwt 登入, 不能拜訪
router.use((req, res, next) => {
  if (!req.my_jwt) {
    // 情境: 沒有登入就禁止訪問路由檔裡的所有路由
    return res.status(403).json({
      success: false,
      message: "沒有權限",
    });
  }
  next();
});
*/
/*
router.use((req, res, next) => {
  const ms = Math.floor(Math.random() * 3000);
  setTimeout(() => {
    // 模擬網路延遲的情況
    next();
  }, ms);
});
*/
// 此路由檔的頂層中間件
/*
router.use((req, res, next) => {
  if (!req.session.admin) {
    // 情境: 沒有登入就禁止訪問路由檔裡的所有路由
    return res.status(403).send(`<h1>沒有權限</h1><p>
      <a href="/login">到登入頁</a>
      </p>`);
  }
  next();
});
*/
/*
router.use((req, res, next) => {
  // 情境: 部份路由在未登入時可以訪問
  if (req.session.admin) {
    return next(); // 有登入不用判斷路徑, 直接通過
  }
  const whiteList = ["/", "/api"]; // 可以訪問的路徑
  let path = req.url.split("?")[0];

  if (!whiteList.includes(path)) {
    // return res.status(403).json({ success: false, message: "沒有授權" });
    return res.redirect("/login");
  }
  next();
});
*/
// ****** 頁面 的路由 *****************
router.get("/", async (req, res) => {
  res.locals.pageName = "ab-list";
  const data = await getListData(req);
  if (data.redirect) {
    // 表示要跳轉頁面
    return res.redirect(data.redirect);
  }
  if (req.session.admin) {
    res.render("address-book/list", data);
  } else {
    res.render("address-book/list-no-admin", data);
  }
});
// *** 新增資料的表單頁
router.get("/add", async (req, res) => {
  res.locals.pageName = "ab-add";
  res.render("address-book/add");
});
// *** 修改資料的表單頁
router.get("/edit/:ab_id", async (req, res) => {
  const item = await getItemData(req);
  if (!item.success) {
    return res.redirect("/address-book"); // 沒取到資料, 回列表頁頁
  }
  res.render("address-book/edit", item.data);
});
// ****** API 的路由 *****************
// *** 取得列表資料
router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

// *** 取得單筆資料
router.get("/api/:ab_id", async (req, res) => {
  const item = await getItemData(req);
  res.status(item.code).json(item);
});

// *** 新增資料
router.post("/api", upload.none(), async (req, res) => {
  const output = {
    success: false, // 有沒有新增成功
    bodyData: req.body, // 除錯用
    insertId: 0, // 新增後的 PK
    issues: [],
  };
  let { name, email, mobile, birthday, address } = req.body;

  const zodResult = abItemSchema.safeParse({
    name,
    email,
    mobile,
    birthday,
    address,
  });
  if (!zodResult.success) {
    if (zodResult.error?.issues?.length) {
      output.issues = zodResult.error.issues;
    }
    return res.status(400).json(output);
  }

  // 處理一下生日沒有給或者給空字串的情況
  if (!birthday) {
    birthday = null;
  }
  const sql = "INSERT INTO `address_book` SET ?";

  try {
    const [result] = await pool.query(sql, [
      { name, email, mobile, birthday, address },
    ]);
    output.success = !!result.affectedRows;
    if (output.success) {
      res.status(201);
      output.insertId = result.insertId;
    }
  } catch (ex) {
    console.log(ex);
    res.status(400);
  }

  res.json(output);
});

// *** 修改資料
router.put("/api/:ab_id", upload.none(), async (req, res) => {
  const output = {
    success: false, // 有沒有新增成功
    bodyData: req.body, // 除錯用
    issues: [],
  };
  const ori = await getItemData(req); // 取得未修改前的資料
  if (!ori.success) {
    // 沒有這筆資料
    return res.status(404).json(output);
  }
  const ab_id = ori.data.ab_id;

  let { name, email, mobile, birthday, address } = req.body;

  const zodResult = abItemSchema.safeParse({
    name,
    email,
    mobile,
    birthday,
    address,
  });
  if (!zodResult.success) {
    if (zodResult.error?.issues?.length) {
      output.issues = zodResult.error.issues;
    }
    return res.status(400).json(output);
  }

  // 處理一下生日沒有給或者給空字串的情況
  if (!birthday) {
    birthday = null;
  }
  const sql = "UPDATE `address_book` SET ? WHERE ab_id=?";

  try {
    const [result] = await pool.query(sql, [
      { name, email, mobile, birthday, address },
      ab_id,
    ]);
    // output.success = !!result.affectedRows;
    output.success = !!result.changedRows;
    if (output.success) {
      res.status(200);
    }
  } catch (ex) {
    console.log(ex);
    res.status(400);
  }

  res.json(output);
});

// *** 刪除資料
router.delete("/api/del_many", upload.none(), async (req, res) => {
  // TODO: 權限問題
  const output = {
    success: false,
    affectedRows: 0,
  };
  // 參數名稱 i
  if (!req.body.i || !req.body.i.length) {
    return res.status(400).json(output);
  }
  const items = req.body.i.map((item) => pool.escape(item)); // 防範 SQL injection

  const sql = `DELETE FROM address_book WHERE ab_id IN (${items.join(",")})`;
  const [result] = await pool.query(sql);
  output.affectedRows = result.affectedRows;
  output.success = !!result.affectedRows;

  res.json(output);
});

router.delete("/api/:ab_id", async (req, res) => {
  const ori = await getItemData(req); // 取得未修改前的資料
  if (!ori.success) {
    // 沒有這筆資料
    return res.status(404).json({ success: false });
  }
  const sql = "DELETE FROM address_book WHERE ab_id=?";
  const [result] = await pool.query(sql, [ori.data.ab_id]);

  res.json({ success: !!result.affectedRows });
});

// *** 加到最愛
router.post("/api/toggle-like/:ab_id", async (req, res) => {
  let output = {
    success: false,
    action: "", // add, remove
    ab_id: req.params.ab_id,
  };
  // 會員必須是已登入的狀態
  let member_id = 0;
  if (req.session.admin?.id) {
    member_id = req.session.admin?.id;
  } else if (req.my_jwt?.id) {
    member_id = req.my_jwt?.id;
  } else {
    return res.status(403).json(output); // 1. 沒有登入
  }

  // 查詢物件是否已加到最愛
  const sql = "SELECT * FROM ab_likes WHERE member_id=? AND ab_id=? ";
  const [rows] = await pool.query(sql, [member_id, req.params.ab_id]);

  if (rows.length) {
    // 原本是有加入的, 要做移除
    output.action = "remove";
    const sql = `DELETE FROM ab_likes WHERE like_id=? `;
    const [result] = await pool.query(sql, [rows[0].like_id]);
    output.success = !!result.affectedRows; // 2. 做移除
  } else {
    // 原本是沒有加入的商品, 要做加入
    //    判斷有沒有這個商品
    const sql = "SELECT ab_id FROM address_book WHERE ab_id=?";
    const [rows2] = await pool.query(sql, [req.params.ab_id]);
    if (rows2.length) {
      // 沒有這個項目, 就加入
      const sql = "INSERT INTO ab_likes (member_id, ab_id) VALUES (?,?)";
      const [result2] = await pool.query(sql, [
        member_id,
        req.params.ab_id,
      ]);
      output.action = "add";
      output.success = !!result2.affectedRows; // 3. 做加入
    } else {
      // 沒有這個商品
      return res.status(404).json(output); // 4. 沒有該商品
    }
  }

  res.json(output);
});

export default router;
