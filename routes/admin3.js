// routes/admin3.js
import express from "express";
const router = express.Router();
router
  .route("/member/edit/:id")
  .all((req, res, next) => {
    res.locals.memberData = {
      name: "shinder",
      id: "A002",
    };
    next();
  })
  .get((req, res) => {
    const obj = {
      data: res.locals.memberData,
    };
    res.send("get edit:" + JSON.stringify(obj));
  })
  .post((req, res) => {
    res.send("post edit:" + JSON.stringify(res.locals.memberData));
  });
export default router;
