"use strict";

const app = require("../functions/sherlock_api");

const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(`KSP Sherlock AI API running on http://localhost:${port}`);
});
