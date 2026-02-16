const express = require("express");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(express.json());

/* ===============================
   Helpers
=================================*/

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(str, "base64").toString();
}

function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

/* ===============================
   1️⃣ Get Authorization URL
=================================*/
const sessionStore = {};


app.get("/auth-url", async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString("hex");

    const authUrl =
      `${process.env.AUTH_URL}?response_type=code` +
      `&client_id=${process.env.CMIC_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(process.env.CMIC_REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(process.env.CMIC_SCOPE)}` +
      `&state=${state}`;

    res.json({ authUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: 0,
      error: err.message,
    });
  }
});


/* ===============================
   2️⃣ Exchange Code For Token
=================================*/

app.post("/exchange", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Authorization code required" });
    }

    const tokenResponse = await fetch(process.env.CMIC_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.CMIC_CLIENT_ID,
        client_secret: process.env.CMIC_CLIENT_SECRET, // REQUIRED
        code,
        redirect_uri: process.env.CMIC_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return res.status(400).json(tokenData);
    }

    res.json(tokenData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});


/* ===============================
   Start Server
=================================*/

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
