import { json } from "@remix-run/node";

export async function loader() {
  try {
    await fetch("https://int.pushnova.app/ping.php");
  } catch (_) {}
  return json({ ok: true, t: Date.now() });
}
