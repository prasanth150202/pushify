import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // adjust path
import crypto from "crypto";

// GET loader
export async function loader({ request }) {
  try {
    // --- Authenticate and get shop domain ---
    const { session } = await authenticate.admin(request);
    const shopDomain = session?.shop;

    if (!shopDomain) {
      return json({ success: false, message: "Unauthorized: Shop not found" }, { status: 401 });
    }

    // AES-256-CBC helpers (Node)
    const AES_PASSPHRASE = "CHANGE_ME_STRONG_PASSPHRASE";
    const AES_IV_SALT = "CHANGE_ME_IV_SALT";
    const deriveKeyIv = (passphrase, ivSalt) => {
      const key = crypto.createHash("sha256").update(passphrase, "utf8").digest(); // 32 bytes
      const ivFull = crypto.createHash("sha256").update(ivSalt, "utf8").digest();
      const iv = ivFull.subarray(0, 16);
      return { key, iv };
    };
    const decryptBase64ToUtf8 = (b64) => {
      try {
        if (!b64 || typeof b64 !== "string") return b64;
        const { key, iv } = deriveKeyIv(AES_PASSPHRASE, AES_IV_SALT);
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
        const cipherBuf = Buffer.from(b64, "base64");
        const part1 = decipher.update(cipherBuf);
        const part2 = decipher.final();
        return Buffer.concat([part1, part2]).toString("utf8");
      } catch {
        // If decryption fails, return original
        return b64;
      }
    };

    // --- Forward the request to PHP backend with shop domain ---
    const response = await fetch(
      `https://api.zingbot.io/push-notify/push-notify/campaigns.php?shop=${encodeURIComponent(
        shopDomain
      )}`
    );

    const data = await response.json();

    if (!response.ok) {
      return json(
        { success: false, message: data.message || "Error fetching campaigns" },
        { status: response.status }
      );
    }

    // --- Normalize for frontend DataTable ---
    const campaigns = (data.data || []).map((c) => {
      // Decrypt encrypted DB fields returned by PHP (campaign_name -> Name)
      const decryptedName = decryptBase64ToUtf8(c.Name);
      return {
        id: c.id,
        name: decryptedName,
        sent: c.Sent,
        clicks: c.Clicks,
        status: c.Status,
        createdAt: c["Created At"],
      };
    });

    return json({ success: true, campaigns });
  } catch (err) {
    console.error("API getcamp error:", err);
    return json({ success: false, message: "Server error" }, { status: 500 });
  }
}
