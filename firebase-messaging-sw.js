// firebase-messaging-sw.js (VERSÃO DATA MESSAGE + ALARME)

importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js'); 

const firebaseConfig = {
  apiKey: "AIzaSyDBt7NcU5rP-hsrBZ07ne_HbiMCHRyVcnY",
  authDomain: "navalha-de-ouro-v11.firebaseapp.com",
  projectId: "navalha-de-ouro-v11",
  storageBucket: "navalha-de-ouro-v11.firebasestorage.app",
  messagingSenderId: "434474263075",
  appId: "1:434474263075:web:163893d68a1b5dbe74c796"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Função de Loop de Notificação
function dispararLoopNotificacao(title, body, data, vezesRestantes) {
    if (vezesRestantes <= 0) return;

    const tituloAlerta = vezesRestantes < 10 ? `🚨 ${title} (Tocando...)` : title;

    self.registration.showNotification(tituloAlerta, {
        body: body,
        icon: '/icone.png',
        vibrate: [500, 200, 500, 200, 500],
        requireInteraction: true,
        tag: 'novo-agendamento', 
        renotify: true,
        data: data
    });

    setTimeout(() => {
        dispararLoopNotificacao(title, body, data, vezesRestantes - 1);
    }, 3500); 
}

// 1. RECEBIMENTO NO BACKGROUND (AGORA LÊ DE 'payload.data')
messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Data Message Recebida:', payload);

  // Como mudamos o server, o título e corpo vêm dentro de 'data'
  const title = payload.data.title;
  const body = payload.data.body;
  const extraData = payload.data; // Dados extras

  // Verifica se é um agendamento para ligar o "Alarme"
  if (title && (title.includes("Novo Agendamento") || title.includes("Vaga") || extraData.forceAlarm === 'true')) {
      dispararLoopNotificacao(title, body, extraData, 10);
  } else {
      // Notificação Normal
      self.registration.showNotification(title, {
          body: body,
          icon: '/icone.png',
          data: extraData
      });
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Recupera o link (agora pode vir como string dentro de data)
  let urlToOpen = '/';
  if (event.notification.data && event.notification.data.link) {
      urlToOpen = event.notification.data.link;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) > -1 && 'focus' in client) {
          return client.focus().then(c => {
             if('navigate' in c) c.navigate(urlToOpen);
             return c;
          });
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Cache Workbox (Mantido)
const CACHE = "pwabuilder-page";
const offlineFallbackPage = "404.html";

self.addEventListener('install', async (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(offlineFallbackPage))
  );
});

if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) return preloadResp;
        return await fetch(event.request);
      } catch (error) {
        const cache = await caches.open(CACHE);
        return await cache.match(offlineFallbackPage);
      }
    })());
  }
});