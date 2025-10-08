// app/routes/api.push_notify.jsx
export async function loader({ request }) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Shopify will call something like:
  // https://yourshop.myshopify.com/apps/push_notify/assets/firebase-messaging-sw.js
  if (pathname.endsWith("firebase-messaging-sw.js")) {
    const swFile = `
      importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js');
      importScripts('https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging.js');

      firebase.initializeApp({
        apiKey: "AIzaSyA2qO98JpzqRzNPjwK01R8bAt8BzqG55W8",
        authDomain: "bawse-baby.firebaseapp.com",
        projectId: "bawse-baby",
        storageBucket: "bawse-baby.appspot.com",
        messagingSenderId: "422376066626",
        appId: "1:422376066626:web:386c912eff83779d71a7db",
        measurementId: "G-D0R1BN5SE1"
      });

      const messaging = firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        const notificationTitle = payload.notification?.title || "New notification";
        const notificationOptions = {
          body: payload.notification?.body || "",
          icon: '/favicon.ico'
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
      });
    `;

    return new Response(swFile, {
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "no-cache"
      },
    });
  }

  return new Response("Not found", { status: 404 });
}
