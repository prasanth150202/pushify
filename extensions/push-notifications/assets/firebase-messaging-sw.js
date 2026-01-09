importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA2qO98JpzqRzNPjwK01R8bAt8BzqG55W8",
  authDomain: "bawse-baby.firebaseapp.com",
  projectId: "bawse-baby",
  storageBucket: "bawse-baby.firebasestorage.app",
  messagingSenderId: "422376066626",
  appId: "1:422376066626:web:386c912eff83779d71a7db",
  measurementId: "G-D0R1BN5SE1"
});

const messaging = firebase.messaging();

// Optional: Customize background notification
messaging.onBackgroundMessage(function (payload) {
  // console.log('[firebase-messaging-sw.js] Background message:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/cdn/shop/files/bawse_baby_logo_NEW_FINAL_120x.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
