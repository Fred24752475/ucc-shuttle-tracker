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
            html: `<div class="campus-car" style="transform: rotate(${bearing + 90}deg)">🚌</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });
    }

    function ensureStyle() {
        if (document.getElementById('campus-car-style')) return;
        const style = document.createElement('style');
        style.id = 'campus-car-style';
        style.textContent = `
            .campus-car { font-size: 26px; line-height: 36px; text-align: center; filter: drop-shadow(0 2px 3px rgba(0,0,0,.45)); transition: transform .2s linear; }
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

        if (route && route.length > 1 && !map._campusRoute) {
            map._campusRoute = L.polyline(route.map((p) => [Number(p[0]), Number(p[1])]), {
                color: '#1565c0',
                weight: 5,
                opacity: 0.85
            }).addTo(map);
            map.fitBounds(map._campusRoute.getBounds(), { padding: [28, 28] });
        }

        const key = map._campusId + ':' + shuttle.id;
        const icon = carIcon(where ? where.bearing : 0);
        if (!cars[key]) {
            cars[key] = L.marker([lat, lng], { icon, zIndexOffset: 600 })
                .addTo(map)
                .bindPopup(`<b>🚌 ${shuttle.vehicle_number || 'Shuttle'}</b><br>${shuttle.driver_name || shuttle.driverName || 'Driver'}<br>${shuttle.routeName || 'Campus Express'}`);
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
            const map = L.map(el, { zoomControl: true }).setView([5.1052, -1.1918], 15);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 20
            }).addTo(map);
            map._campusId = containerId;
            maps[containerId] = map;
            const stops = [
                [5.1044, -1.1947, 'Main Gate'],
                [5.1060, -1.1914, 'Science Block'],
                [5.1074, -1.1878, 'Hostel Area'],
                [5.1044, -1.1904, 'Admin Block']
            ];
            stops.forEach(([lat, lng, name]) => {
                L.circleMarker([lat, lng], { radius: 6, color: '#0d47a1', fillColor: '#42a5f5', fillOpacity: 0.9 })
                    .addTo(map)
                    .bindPopup(name);
            });
        }
        setTimeout(() => maps[containerId].invalidateSize(), 200);
        bindSocket();
        refresh();
        return maps[containerId];
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
