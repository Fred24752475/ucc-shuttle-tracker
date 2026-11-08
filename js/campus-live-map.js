// OpenStreetMap for student and driver dashboards.
// A shuttle that is on a trip glides along the campus loop.
(function () {
    const maps = {};
    const cars = {};
    let shuttles = [];
    let animating = false;
    let socketBound = false;

    function pointOnRoute(route, startedAt, loopMs, now) {
        if (!route || route.length < 2 || !startedAt) return null;
        const span = route.length - 1;
        const t = ((now - startedAt) % loopMs) / loopMs;
        const pos = t * span;
        const i = Math.floor(pos);
        const f = pos - i;
        const a = route[i];
        const b = route[Math.min(i + 1, span)];
        const lat = Number(a[0]) + (Number(b[0]) - Number(a[0])) * f;
        const lng = Number(a[1]) + (Number(b[1]) - Number(a[1])) * f;
        const bearing = Math.atan2(Number(b[1]) - Number(a[1]), Number(b[0]) - Number(a[0])) * 180 / Math.PI;
        return { lat, lng, bearing };
    }

    function carIcon(bearing) {
        return L.divIcon({
            className: 'leaflet-div-icon campus-car-icon',
            html: `<div style="width:34px;height:58px;transform:rotate(${bearing}deg);transform-origin:center center;">
                <div style="width:34px;height:58px;background:#128a3a;border-radius:10px;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.45);overflow:hidden;">
                    <div style="height:12px;margin:4px 4px 0;background:#102033;border-radius:3px;"></div>
                    <div style="height:5px;margin-top:8px;background:#f5c518;"></div>
                    <div style="height:4px;background:#d23b2e;"></div>
                </div>
            </div>`,
            iconSize: [34, 58],
            iconAnchor: [17, 29]
        });
    }

    function ensureStyle() {
        if (document.getElementById('campus-car-style')) return;
        const style = document.createElement('style');
        style.id = 'campus-car-style';
        style.textContent = `
            .leaflet-div-icon.campus-car-icon { background: transparent !important; border: none !important; }
            .you-dot { width: 16px; height: 16px; margin: 6px auto 0; border-radius: 50%; background: #0a66c2; border: 3px solid white; box-shadow: 0 0 0 8px rgba(10,102,194,.25); }
            .you-label { display: none; }
            .leaflet-container { background: #dbe7df; font-family: inherit; }
        `;
        document.head.appendChild(style);
    }

    function drawShuttle(map, shuttle) {
        const route = shuttle.route;
        const where = pointOnRoute(route, shuttle.startedAt, shuttle.loopMs || 150000, Date.now());
        const lat = where ? where.lat : Number(shuttle.latitude);
        const lng = where ? where.lng : Number(shuttle.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        if (route && route.length > 1) {
            map._drawnRoutes = map._drawnRoutes || {};
            if (!map._drawnRoutes[shuttle.id]) {
                map._drawnRoutes[shuttle.id] = L.polyline(route.map((p) => [Number(p[0]), Number(p[1])]), {
                    color: '#128a3a',
                    weight: 3,
                    opacity: 0.35
                }).addTo(map);
            }
        }

        const key = map._campusId + ':' + shuttle.id;
        const icon = carIcon(where ? where.bearing : 0);
        if (!cars[key]) {
            cars[key] = L.marker([lat, lng], { icon, zIndexOffset: 600 })
                .addTo(map)
                .bindPopup(`<b>${shuttle.vehicle_number || 'Shuttle'}</b><br>${shuttle.driver_name || shuttle.driverName || 'Driver'}<br>${shuttle.routeName || 'Campus Express'}`);
        } else {
            cars[key].setLatLng([lat, lng]);
            cars[key].setIcon(icon);
        }
    }

    function frame() {
        Object.values(maps).forEach((map) => {
            shuttles.forEach((shuttle) => drawShuttle(map, shuttle));
        });
        if (Object.keys(maps).length && shuttles.some((s) => s.startedAt)) {
            requestAnimationFrame(frame);
        } else {
            animating = false;
        }
    }

    function startAnimation() {
        if (animating) return;
        animating = true;
        requestAnimationFrame(frame);
    }

    async function refresh() {
        const token = localStorage.getItem('ucc_token');
        if (!token) return;
        try {
            const response = await fetch('/api/shuttles/active', {
                headers: { Authorization: 'Bearer ' + token }
            });
            const data = await response.json();
            if (data.success) {
                shuttles = data.shuttles || [];
                startAnimation();
            }
        } catch (error) {
            console.error('Map shuttle refresh failed', error);
        }
    }

    function bindSocket() {
        if (socketBound || typeof io === 'undefined') return;
        socketBound = true;
        const socket = io();
        socket.on('shuttle_location_update', (data) => {
            const id = data.shuttleId;
            const existing = shuttles.find((s) => String(s.id) === String(id));
            const next = {
                id,
                latitude: data.latitude,
                longitude: data.longitude,
                vehicle_number: data.vehicleNumber || existing?.vehicle_number,
                driver_name: data.driverName || existing?.driver_name,
                routeName: data.routeName,
                route: data.route || existing?.route,
                startedAt: data.startedAt || existing?.startedAt,
                loopMs: data.loopMs || existing?.loopMs || 150000
            };
            shuttles = shuttles.filter((s) => String(s.id) !== String(id)).concat(next);
            startAnimation();
        });
        socket.on('shuttle_offline', (data) => {
            shuttles = shuttles.filter((s) => String(s.id) !== String(data.shuttleId));
            Object.keys(cars).forEach((key) => {
                if (key.endsWith(':' + data.shuttleId)) {
                    cars[key].remove();
                    delete cars[key];
                }
            });
        });
    }

    function attach(containerId) {
        const el = document.getElementById(containerId);
        if (!el || typeof L === 'undefined') return null;
        ensureStyle();
        if (el.querySelector('.simple-map-placeholder')) el.innerHTML = '';
        const compact = window.matchMedia('(max-width: 900px)').matches;
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('height', compact ? '260px' : 'min(68vh, 520px)', 'important');
        el.style.setProperty('min-height', compact ? '260px' : '320px', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('background', 'transparent', 'important');
        if (!maps[containerId]) {
            const map = L.map(el, { zoomControl: true }).setView([5.116, -1.289], 15);
            const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                maxZoom: 19
            });
            tiles.on('tileloadstart', (event) => {
                event.tile.referrerPolicy = 'origin';
            });
            tiles.addTo(map);
            map._campusId = containerId;
            maps[containerId] = map;
            const campus = L.latLngBounds([5.104, -1.302], [5.134, -1.272]);
            map.fitBounds(campus, { padding: [16, 16] });
            pinSignedInUser(map);
        }
        const redraw = () => {
            const map = maps[containerId];
            if (!map) return;
            map.invalidateSize();
            map.fitBounds(L.latLngBounds([5.104, -1.302], [5.134, -1.272]), { padding: [16, 16] });
        };
        requestAnimationFrame(redraw);
        setTimeout(redraw, 120);
        setTimeout(redraw, 400);
        bindSocket();
        refresh();
        return maps[containerId];
    }

    function pinSignedInUser(map) {
        const icon = L.divIcon({
            className: 'you-pin',
            html: '<div class="you-dot"></div><div class="you-label">You</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
        const drop = (lat, lng, label) => {
            if (map._youMarker) map._youMarker.remove();
            map._youMarker = L.marker([lat, lng], { icon, zIndexOffset: 900 }).addTo(map).bindPopup(label);
        };
        const onCampus = () => drop(5.1155, -1.2909, 'You are here on UCC campus');
        if (!navigator.geolocation) return onCampus();
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const inside = lat > 5.104 && lat < 5.134 && lng > -1.302 && lng < -1.272;
            if (inside) drop(lat, lng, 'You are here');
            else onCampus();
        }, onCampus, { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 });
    }

    window.CampusLiveMap = { attach, refresh };

    function boot() {
        if (typeof L === 'undefined') {
            setTimeout(boot, 200);
            return;
        }
        if (document.getElementById('liveMap')) attach('liveMap');
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})();
