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
// 2. LÓGICA DE NOTIFICAÇÃO E ALARME (MANTIDA INTACTA)
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

// ==============================================================
// 3. CACHE E INTERCEPTAÇÃO (CORRIGIDO PARA UPLOADS)
// ==============================================================

// Atualizei a versão para garantir que o navegador substitua o arquivo antigo
const CACHE_NAME = 'king-agenda-shell-v476'; 
const OFFLINE_URL = '/offline.html';

const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/offline.html',
  '/firebase-messaging-sw.js',
  '/manifest.json',
  '/icone.png',
  // Firebase SDKs
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage-compat.js',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap',
  // Leaflet (Mapas)
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css',
  'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js',
  // Bibliotecas essenciais
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://unpkg.com/@studio-freight/lenis@1.0.33/dist/lenis.min.js'
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
        if (key !== CACHE_NAME) {
          // console.log('🧹 SW: Limpando cache antigo:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// C. INTERCEPTAÇÃO DE REDE (AQUI ESTAVA O ERRO)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // --- 🛡️ TRAVA DE SEGURANÇA (NOVA) ---
  // 1. Se for Upload (POST, PUT, DELETE), IGNORA o Service Worker.
  //    Isso resolve o erro "Request method 'POST' is unsupported".
  if (request.method !== 'GET') {
      return; 
  }

  // 2. Se for para o Firebase Storage ou Firestore, IGNORA o Service Worker.
  //    Deixa o navegador tratar direto. Isso resolve os erros de CORS e QUIC.
  if (url.hostname.includes('firebasestorage.googleapis.com') || 
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('googleapis.com')) {
      return;
  }
  // --- FIM DA TRAVA ---

  // 3. ESTRATÉGIA PARA O APP (HTML, CSS, JS, Ícones Locais)
  // Só aplica cache nos arquivos do próprio site para funcionar offline.
  if (request.mode === 'navigate' || request.destination === 'script' || request.destination === 'style' || request.destination === 'image') {
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