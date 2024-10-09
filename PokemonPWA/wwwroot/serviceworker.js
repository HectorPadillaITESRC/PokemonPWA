// service-worker.js

let urls = [
    "/",
    "/index",
    "/datos",
    "/manifest.json",
    "/serviceworker.js",
    "/estilos.css",
    "/imgs/icono.png",
    "/imgs/icono-128.png",
    "/imgs/icono-512.png",
    "/imgs/pokemon.png",
];

let cacheName = "pokemonCachev1";

async function precache() {
    let cache = await caches.open(cacheName);
    await cache.addAll(urls);
}

//Precache
self.addEventListener("install", function (e) {
    e.waitUntil(precache());
});


self.addEventListener('fetch', event => {
    if (event.request.url.includes(".jpg")) {
        event.respondWith(cacheFirst(event.request));
    }
    else if (event.request.url.startsWith("https://itesrc.net/api"){
        event.respondWith(staleWhileRevalidate(event.request));
    }
    else {
        event.respondWith(fetch(event.request));
    }

});
async function cacheOnly(url) {

    try {
        let cache = await caches.open(cacheName);
        let response = await cache.match(url);
        if (response) {
            return response;
        } else {
            return new Response("No se encontro en cache");
        }
    } catch (x) {
        console.log(x);
    }
}
async function cacheFirst(url) {

    try {
        let cache = await caches.open(cacheName);
        let response = await cache.match(url);
        if (response) {
            return response;
        } else {
            let respuesta = await fetch(url);
            cache.put(url, respuesta.clone());
            return respuesta;
        }
    } catch (x) {
        console.log(x);
    }
}

async function networkFirst(url) {
    let cache = await caches.open(cacheName);
    try {
        let respuesta = await fetch(url);
        cache.put(url, respuesta.clone());
        return respuesta;
    } catch (x) {
        let response = await cache.match(url);
        if (response) {
            return response;
        }
        else
            console.log(x);
    }
}

async function staleWhileRevalidate(url) {
    try {
        let cache = await caches.open(cacheName);
        let response = await cache.match(url);

        let r = fetch(url).then(response => {
            cache.put(url, response.clone());
            return response;
        })

        return response || r;
    } catch (x) {
        console.log(x);
    }
}

let channel = new BroadcastChannel("refreshChannel")

async function staleThenRevalidate(req) {
    let cache = await caches.open(cacheName);
    let response = await cache.match(req);

    if (response) {

        fetch(req).then(async (res) => {
            let networkResponse = await fetch(req);
            let cacheData = await response.text();
            let networkData = await networkResponse.clone().text();

            if (cacheData != networkData) {
                cache.put(req, networkResponse.clone());
                channel.postMessage({
                    url: req.url, data: networkData
                });
            }


        })

        return response.clone();
    }
    else {
        return networkFirst(req);
    }
}

let maxage = 24 * 60 * 60 * 1000;

async function timeBasedCache(req) {
    let cache = await caches.open(cacheName);

    let cacheResponse = await cache.match(req);

    if (cacheResponse) {
        let fechadescarga = cacheResponse.headers.get("fecha");
        let fecha = new Date(fechadescarga);
        let hoy = new Date();
        let diferencia = hoy - fecha;

        if (diferencia <= maxage) { //Si no ha caducado
            return cacheResponse;
        }
    }
    let networkResponse = await fetch(req);
    let nuevoResponse = new Response(networkResponse.body, {
        statusText: networkResponse.statusText,
        status: networkResponse.status,
        headers: networkResponse.headers,
        type: networkResponse.type
    });
    nuevoResponse.headers.append("fecha", new Date().toISOString());
    cache.put(req, nuevoResponse);
    return networkResponse;

}


async function networkCacheRace(req) {
    let cache = await caches.open(cacheName);

    let promise1 = fetch(req).then(response => {
        cache.put(req, response.clone());
        return response;
    });
    let promise2 = cache.match(req);

    return Promise.race([promise1, promise2])
}