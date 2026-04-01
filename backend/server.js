const express = require("express");
const cors = require("cors");
const path = require("path");

const leadsRouter = require("./routes/leads");

function createApp() {
  const app = express();
  const frontendPath = path.join(__dirname, "..", "frontend");

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/leads", leadsRouter);
  app.use(express.static(frontendPath));

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("*", (_req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });

  app.use((err, _req, res, _next) => {
    console.error("Unhandled server error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`VeeCasa DSCR app listening on port ${PORT}`);
  });
}

module.exports = { createApp };
