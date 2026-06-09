"use strict";

const serverless = require("serverless-http");
const app = require("../../functions/sherlock_api");

module.exports.handler = serverless(app, {
  request(request, event) {
    if (event.path && event.path.startsWith("/.netlify/functions/api/")) {
      const suffix = event.path.replace("/.netlify/functions/api/", "");
      request.url = `/api/${suffix}${event.rawQuery ? `?${event.rawQuery}` : ""}`;
    }
  }
});
