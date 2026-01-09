// app/routes/api.sendcamp.jsx
export const action = async ({ request }) => {
  try {
    const body = await request.json();

    // Forward to Zingbot handler
    const response = await fetch(
      "https://int.pushnova.app/shop_handler.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const text = await response.text();

    return new Response(
      JSON.stringify({
        success: true,
        forwarded: true,
        response: text,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error forwarding shop data:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Ensure Remix treats this as an API route
export const loader = () => {
  return new Response(
    JSON.stringify({ error: "Method not allowed" }),
    { status: 405, headers: { "Content-Type": "application/json" } }
  );
};
