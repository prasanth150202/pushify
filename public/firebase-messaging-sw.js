importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDlAIWrQeYfui2kO1CulpTeMz8FB7hT_2s",
    authDomain: "push-notify-2025.firebaseapp.com",
    projectId: "push-notify-2025",
    storageBucket: "push-notify-2025.firebasestorage.app",
    messagingSenderId: "666851901382",
    appId: "1:666851901382:web:3e159468bc36d128dafcc7"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon || '/logo.png',
        data: {
            click_action: payload.notification.click_action || payload.data?.click_action || "/"
        },
        requireInteraction: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================
// CLICK HANDLER
// ============================
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.click_action || "/";

    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsList) => {
            for (const client of clientsList) {
                if (client.url.includes(url) && "focus" in client) return client.focus();
            }
            return clients.openWindow(url);
        })
    );
});
