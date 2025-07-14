const multi = async () => {
  // *** 後端需要 upload.none() 處理

  const fd = new FormData(document.form1);
  const r = await fetch("/login", {
    method: "POST",
    body: fd,
  });

  const data = await r.json();
  console.log({ data });
};

const urlencoded = async () => {
  const fd = new FormData(document.form1);
  const usp = new URLSearchParams(fd);
  const r = await fetch("/login", {
    method: "POST",
    body: usp.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  const data = await r.json();
  console.log({ data });
};

const json = async () => {
  const fd = new FormData(document.form1);

  const dataObj = {};
  for (let [k, v] of fd.entries()) {
    // console.log({ k, v });
    dataObj[k] = v; // 將資料組成 Object
  }

  const r = await fetch("/login", {
    method: "POST",
    body: JSON.stringify(dataObj),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await r.json();
};
