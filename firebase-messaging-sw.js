// ==============================================================
// 1. CONFIGURAÇÕES E IMPORTAÇÕES (FIREBASE)
// ==============================================================
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');

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

// ==============================================================
// 2. LÓGICA DE NOTIFICAÇÃO E ALARME (MANTIDA)
// ==============================================================

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

messaging.onBackgroundMessage(function(payload) {
  console.log('[SW] Data Message:', payload);
  const title = payload.data.title;
  const body = payload.data.body;
  const extraData = payload.data; 
  if (title && (title.includes("Novo Agendamento") || title.includes("Vaga") || extraData.forceAlarm === 'true')) {
      dispararLoopNotificacao(title, body, extraData, 10);
  } else {
      self.registration.showNotification(title, {
          body: body,
          icon: '/icone.png',
          data: extraData
      });
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
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

const CACHE_NAME = 'king-agenda-shell-v74'; // Atualizei a versão para limpar o antigo
const CACHE_IMAGES = 'king-agenda-images-v74'; 
const OFFLINE_URL = '/offline.html';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/firebase-messaging-sw.js',
  '/manifest.json',
  '/icone.png'
];

// A. INSTALAÇÃO
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 SW: Instalando App Shell...');
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// B. ATIVAÇÃO (Limpeza de caches velhos)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME && key !== CACHE_IMAGES) {
          console.log('🧹 SW: Limpando cache antigo:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// C. INTERCEPTAÇÃO E ESTRATÉGIA HÍBRIDA
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. ESTRATÉGIA PARA IMAGENS (Google Storage, Avatares, Produtos)
  if (request.destination === 'image' || url.hostname.includes('firebasestorage.googleapis.com')) {
      event.respondWith(
          caches.open(CACHE_IMAGES).then(async (cache) => {
              // Tenta pegar do cache primeiro
              const cachedResponse = await cache.match(request);
              if (cachedResponse) return cachedResponse;

              // Se não tem, baixa da rede e guarda
              try {
                  // mode: 'no-cors' permite baixar imagens opacas (de outros domínios sem cabeçalho)
                  const networkResponse = await fetch(request, { mode: 'no-cors' });
                  
                  // Salva no cache (mesmo se for opaca/status 0)
                  cache.put(request, networkResponse.clone());
                  
                  return networkResponse;
              } catch(e) {
                  // Se falhar (sem net e sem cache), retorna vazio ou placeholder
                  return new Response('', { status: 404, statusText: 'Offline Image' });
              }
          })
      );
      return;
  }

  // 2. ESTRATÉGIA PARA O APP (HTML, CSS, JS Local)
  if (request.mode === 'navigate' || request.destination === 'script' || request.destination === 'style') {
      event.respondWith(
          caches.match(request).then((cachedResponse) => {
              // Tem no cache? Entrega na hora!
              if (cachedResponse) return cachedResponse;

              // Não tem? Busca na rede.
              return fetch(request).catch(() => {
                  // Sem rede? Se for navegação, entrega a página offline
                  if (request.mode === 'navigate') {
                      return caches.match(OFFLINE_URL);
                  }
              });
          })
      );
      return;
  }
});