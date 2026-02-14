const express = require("express");
const crypto = require("crypto");
require("dotenv").config();
const axios = require("axios");

// Node 18+ has global fetch
// If using Node <18, install node-fetch and uncomment:
// const fetch = require("node-fetch");

const app = express();
app.use(express.json());

const cors = require('cors');
var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
    methods: "*",
    exposedHeaders: ['authorization', 'x', 'y']
}
app.use(cors(corsOptions))

/* ===============================
   In-Memory Session Store
   (For Development Only)
=================================*/
const sessionStore = {};

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



// Controller: exchange code for token
// exports.exchangeCode = async (req, res) => {
//   const { code, state } = req.body;

//   const codeVerifier = sessionStore[state];
//   if (!codeVerifier) return res.status(400).json({ error: "Invalid state or expired" });

//   try {
//     const tokenResponse = await fetch(process.env.CMIC_TOKEN_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/x-www-form-urlencoded" },
//       body: new URLSearchParams({
//         grant_type: "authorization_code",
//         client_id: process.env.CMIC_CLIENT_ID,
//         client_secret: process.env.CMIC_CLIENT_SECRET,
//         code,
//         code_verifier: codeVerifier,
//         redirect_uri: process.env.CMIC_REDIRECT_URI,
//       }),
//     });

//     const tokenData = await tokenResponse.json();

//     // Delete used state
//     delete sessionStore[state];

//     res.json(tokenData);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Token exchange failed" });
//   }
// };

app.get("/auth-url", async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString("hex");

    const authUrl =
      `${process.env.AUTH_URL}?response_type=code` +
      `&client_id=${process.env.CMIC_CLIENT_ID}` +
      `&redirect_uri=${encodeURIComponent(process.env.CMIC_REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(process.env.CMIC_SCOPE)}` +
      `&state=${state}`;

    res.json({ authUrl, state });

  } catch (err) {
    return res.status(500).json({
      success: 0,
      error: err.message,
    });
  }
});

/* ===============================
   2️⃣ Exchange Code For Token
=================================*/

app.post("/exchange", async (req, res) => {
  const { code } = req.body;

  try {
    const tokenResponse = await axios.post(
      process.env.CMIC_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.CMIC_CLIENT_ID,
        client_secret: process.env.CMIC_CLIENT_SECRET, // ✅ REQUIRED
        code,
        redirect_uri: process.env.CMIC_REDIRECT_URI,
      }).toString(),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return res.json({
      success: 1,
      data: tokenResponse.data,
    });

  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(400).json({
      success: 0,
      error: err.response?.data || "Token exchange failed",
    });
  }
});



/* ===============================
   Root Route
=================================*/

app.get("/", (req, res) => {
  res.json({
    success: 1,
    message: "CMiC OAuth Server Running 🚀",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
