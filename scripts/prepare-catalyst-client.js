"use strict";

const fs = require("fs");
const path = require("path");

const distDir = path.join(__dirname, "..", "dist");

if (!fs.existsSync(distDir)) {
  throw new Error("dist directory not found. Run vite build first.");
}

const clientPackage = {
  name: "ksp-sherlock-ai-client",
  version: "1.0.0",
  homepage: ".",
  scripts: {
    start: "vite --host 0.0.0.0",
    build: "vite build"
  }
};

fs.writeFileSync(
  path.join(distDir, "client-package.json"),
  `${JSON.stringify(clientPackage, null, 2)}\n`
);
