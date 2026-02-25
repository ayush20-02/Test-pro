const express = require("express");
const crypto = require("crypto");
require("dotenv").config();
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());

app.use(cors({
  origin: "*",
  methods: "*",
  allowedHeaders: "*",
}));



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

    res.json({ authUrl , state });

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
    console.log("----- /exchange API called -----");

    const { code } = req.body;

    if (!code) {
      console.log("Authorization code missing");
      return res.status(400).json({
        success: 0,
        message: "Authorization code required",
      });
    }

    console.log("Exchanging code for token...");

    const tokenResponse = await axios.post(
      process.env.CMIC_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.CMIC_CLIENT_ID,
        client_secret: process.env.CMIC_CLIENT_SECRET,
        code,
        redirect_uri: process.env.CMIC_REDIRECT_URI,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("Token response received");

    if (tokenResponse.status !== 200) {
      console.log("Token exchange failed with status:", tokenResponse.status);

      return res.status(tokenResponse.status).json({
        success: 0,
        message: "Token exchange failed",
        data: tokenResponse.data,
      });
    }

    console.log("Token exchange success");

    return res.status(200).json({
      success: 1,
      message: "Token exchanged successfully",
      data: tokenResponse.data,
    });

  } catch (err) {
    console.error("Token exchange error:");

    if (err.response) {
      // API returned error response (400, 401, etc.)
      console.error("Status:", err.response.status);
      console.error("Data:", err.response.data);

      return res.status(err.response.status).json({
        success: 0,
        message: "OAuth server error",
        error: err.response.data,
      });
    }

    if (err.request) {
      // No response received
      console.error("No response received:", err.request);

      return res.status(500).json({
        success: 0,
        message: "No response received from OAuth server",
      });
    }

    // Other errors
    console.error("Error message:", err.message);

    return res.status(500).json({
      success: 0,
      message: "Token exchange failed",
      error: err.message,
    });
  }
});
/* ===============================
   Start Server
=================================*/

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
