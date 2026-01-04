const CACHE_NAME = 'myfinance-v1';
const urlsToCache = [
  './',
  './index.html',
  './paginas/transacoes.html',
  './paginas/cartoes.html',
  './paginas/planejamento.html',
  './paginas/relatorios.html',
  './css/style.css',
  './js/app.js',
  './js/config.js',
  './js/reports.js',
  './js/relatorios.js',
  './js/vendor/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('Erro ao cachear:', error);
      })
  );
  // Ativa imediatamente sem esperar
  self.skipWaiting();
});

// Ativação - limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Toma controle imediato de todas as páginas
  self.clients.claim();
});

// Intercepta requisições - Strategy: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, armazena no cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // Se offline, busca do cache
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // Se não encontrar no cache, retorna página offline (opcional)
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Escuta mensagens para atualizar o cache
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
