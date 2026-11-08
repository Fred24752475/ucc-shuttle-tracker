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
            className: 'campus-car-icon',
            html: `<div class="campus-bus" style="transform: rotate(${bearing}deg)">
                <svg viewBox="0 0 32 56" aria-hidden="true">
                    <rect x="4" y="3" width="24" height="50" rx="7" fill="#128a3a"/>
                    <rect x="6.5" y="6" width="19" height="9" rx="2.5" fill="#102033"/>
                    <rect x="7" y="18" width="18" height="18" rx="1.5" fill="#0d3a22" opacity="0.35"/>
                    <rect x="4" y="24" width="24" height="3.2" fill="#f5c518"/>
                    <rect x="4" y="27.2" width="24" height="2" fill="#d23b2e"/>
                    <circle cx="10" cy="8.5" r="1.3" fill="#fff"/>
                    <circle cx="22" cy="8.5" r="1.3" fill="#fff"/>
                    <rect x="1" y="14" width="3" height="7" rx="1" fill="#1a1a1a"/>
                    <rect x="28" y="14" width="3" height="7" rx="1" fill="#1a1a1a"/>
                    <rect x="1" y="36" width="3" height="7" rx="1" fill="#1a1a1a"/>
                    <rect x="28" y="36" width="3" height="7" rx="1" fill="#1a1a1a"/>
                </svg>
            </div>`,
            iconSize: [32, 56],
            iconAnchor: [16, 28]
        });
    }

    function ensureStyle() {
        if (document.getElementById('campus-car-style')) return;
        const style = document.createElement('style');
        style.id = 'campus-car-style';
        style.textContent = `
            .campus-bus { width: 32px; height: 56px; filter: drop-shadow(0 3px 4px rgba(0,0,0,.45)); }
            .campus-bus svg { width: 32px; height: 56px; display: block; }
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
                    color: '#0a66c2',
                    weight: 4,
                    opacity: 0.55
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
        el.style.setProperty('height', '420px', 'important');
        el.style.setProperty('width', '100%', 'important');
        el.style.setProperty('min-height', '420px', 'important');
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
            const stops = [
                [5.1085, -1.2980, 'West Gate'],
                [5.1155, -1.2909, 'Administration'],
                [5.1183, -1.2886, 'Science'],
                [5.1136, -1.2788, 'East Gate']
            ];
            stops.forEach(([lat, lng, name]) => {
                L.circleMarker([lat, lng], { radius: 5, color: '#083e75', fillColor: '#7cc4ff', fillOpacity: 0.95 })
                    .addTo(map)
                    .bindPopup(name);
            });
            pinSignedInUser(map);
        }
        setTimeout(() => maps[containerId].invalidateSize(), 200);
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
