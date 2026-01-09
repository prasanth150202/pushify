import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server"; // adjust path if needed
import { callInternalAndExternal } from "../utils/parallelRequests.server";
import crypto from "crypto";

// Handle GET
export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const shopDomain = session?.shop;
  if (!shopDomain) {
    return json({ error: "Shop not found in session" }, { status: 400 });
  }

  try {
    // AES-256-CBC helpers (Node) for decrypting template titles if encrypted
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
        return b64;
      }
    };

    const res = await fetch(
      `https://int.pushnova.app/templates.php?shopdomain=${shopDomain}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!res.ok) {
      throw new Error(`PHP API error: ${res.status}`);
    }

    const data = await res.json();
    const list = Array.isArray(data.data) ? data.data : [];
    const templates = list.map((tpl) => ({
      ...tpl,
      title: decryptBase64ToUtf8(tpl.title),
    }));
    return json({ templates });
  } catch (err) {
    console.error("Template fetch failed", err);
    return json({ error: "Failed to fetch templates" }, { status: 500 });
  }
}

// Handle POST & DELETE
export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const shopDomain = session?.shop;

  const method = request.method;

  try {
    if (method === "POST") {
      const body = await request.json();
      body.shop_domain = shopDomain; // inject shop domain

      const result = await callInternalAndExternal({
        internalUrl: `${process.env.INTERNAL_BASE_URL}/api/templates`,
        internalInit: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        externalUrl: "https://int.pushnova.app/templates.php",
        externalInit: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      });

      const status = result.success ? 200 : 207;
      return json(result, { status });
    }

    if (method === "DELETE") {
      const body = await request.json();

      const result = await callInternalAndExternal({
        internalUrl: `${process.env.INTERNAL_BASE_URL}/api/templates`,
        internalInit: {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        externalUrl: "https://int.pushnova.app/templates.php",
        externalInit: {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      });

      const status = result.success ? 200 : 207;
      return json(result, { status });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error("Template action failed", err);
    return json({ error: "API request failed" }, { status: 500 });
  }
}
