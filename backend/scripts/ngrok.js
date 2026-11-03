require("dotenv").config();

const { spawn } = require("child_process");

const domain = process.env.NGROK_DOMAIN;
const port = process.env.PORT || 5000;

if (!domain) {
    console.error("ERROR: NGROK_DOMAIN chưa được cấu hình trong file .env");
    process.exit(1);
}

const tunnel = spawn(
    "ngrok",
    ["http", `--domain=${domain}`, String(port)],
    { stdio: "inherit" }
);

tunnel.on("error", (error) => {
    console.error("Không thể chạy ngrok:", error.message);
});

tunnel.on("exit", (code) => {
    process.exit(code ?? 1);
});