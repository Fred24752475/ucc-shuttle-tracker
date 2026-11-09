window.Feedback = {
    stars: 0,

    init: function () {
        const reportForm = document.getElementById('problemReportForm');
        if (reportForm && !reportForm.dataset.bound) {
            reportForm.dataset.bound = '1';
            reportForm.addEventListener('submit', (event) => this.submitReport(event));
        }
        const ratingForm = document.getElementById('driverRatingForm');
        if (ratingForm && !ratingForm.dataset.bound) {
            ratingForm.dataset.bound = '1';
            ratingForm.addEventListener('submit', (event) => this.submitRating(event));
            document.querySelectorAll('#satisfactionStars button').forEach((button) => {
                button.addEventListener('click', () => this.setStars(Number(button.dataset.stars)));
            });
        }
    },

    token: function () {
        return localStorage.getItem('ucc_token');
    },

    setStatus: function (id, message, kind) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = message || '';
        el.classList.remove('ok', 'bad');
        if (kind) el.classList.add(kind);
    },

    async readBody(response) {
        try {
            return await response.json();
        } catch (error) {
            return { success: false, message: 'Something went wrong. Try again in a moment.' };
        }
    },

    setStars: function (count) {
        this.stars = count;
        document.querySelectorAll('#satisfactionStars button').forEach((button) => {
            const on = Number(button.dataset.stars) <= count;
            button.classList.toggle('is-on', on);
            button.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        const label = document.getElementById('satisfactionValue');
        if (label) label.textContent = count ? count + ' out of 5' : 'No stars selected';
    },

    async loadDrivers() {
        const select = document.getElementById('ratingDriver');
        if (!select) return;
        const token = this.token();
        if (!token) {
            this.setStatus('driverRatingStatus', 'Please sign in again.', 'bad');
            return;
        }
        try {
            const response = await fetch('/api/ratings/drivers', {
                headers: { Authorization: 'Bearer ' + token }
            });
            const data = await this.readBody(response);
            if (!response.ok || !data.success) {
                this.setStatus('driverRatingStatus', data.message || 'Could not load the drivers. Try again.', 'bad');
                return;
            }
            const current = select.value;
            const drivers = data.drivers || [];
            select.innerHTML = '<option value="">Choose a driver</option>' + drivers.map((driver) => {
                const name = String(driver.name || 'Driver').replace(/[&<>"']/g, (char) => ({
                    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
                }[char]));
                return '<option value="' + Number(driver.id) + '">' + name + '</option>';
            }).join('');
            if (current) select.value = current;
            if (!drivers.length) {
                this.setStatus('driverRatingStatus', 'No drivers are available to rate yet.', 'bad');
            }
        } catch (error) {
            this.setStatus('driverRatingStatus', 'Could not load the drivers. Try again.', 'bad');
        }
    },

    async submitReport(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const description = (document.getElementById('problemDescription').value || '').trim();
        if (description.length < 8) {
            this.setStatus('problemReportStatus', 'Describe the problem in a sentence or two.', 'bad');
            return;
        }
        const token = this.token();
        if (!token) {
            this.setStatus('problemReportStatus', 'Please sign in again.', 'bad');
            return;
        }
        const button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        this.setStatus('problemReportStatus', 'Sending your report.', '');
        try {
            const response = await fetch('/api/reports', {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ description })
            });
            const data = await this.readBody(response);
            if (!response.ok || !data.success) {
                this.setStatus('problemReportStatus', data.message || 'Could not send that report. Try again.', 'bad');
                return;
            }
            form.reset();
            this.setStatus('problemReportStatus', data.message || 'Thanks. Your report was sent.', 'ok');
        } catch (error) {
            this.setStatus('problemReportStatus', 'Could not send that report. Try again.', 'bad');
        } finally {
            if (button) button.disabled = false;
        }
    },

    async submitRating(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const driverId = Number(document.getElementById('ratingDriver').value);
        const note = (document.getElementById('ratingNote').value || '').trim();
        if (!driverId) {
            this.setStatus('driverRatingStatus', 'Choose a driver.', 'bad');
            return;
        }
        if (this.stars < 1 || this.stars > 5) {
            this.setStatus('driverRatingStatus', 'Choose a satisfaction rating from 1 to 5.', 'bad');
            return;
        }
        const token = this.token();
        if (!token) {
            this.setStatus('driverRatingStatus', 'Please sign in again.', 'bad');
            return;
        }
        const button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        this.setStatus('driverRatingStatus', 'Saving your rating.', '');
        try {
            const response = await fetch('/api/ratings', {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ driverId, stars: this.stars, note })
            });
            const data = await this.readBody(response);
            if (!response.ok || !data.success) {
                this.setStatus('driverRatingStatus', data.message || 'Could not save that rating. Try again.', 'bad');
                return;
            }
            form.reset();
            this.setStars(0);
            this.setStatus('driverRatingStatus', data.message || 'Thanks. Your rating was saved.', 'ok');
        } catch (error) {
            this.setStatus('driverRatingStatus', 'Could not save that rating. Try again.', 'bad');
        } finally {
            if (button) button.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => window.Feedback.init());
if (document.readyState !== 'loading') window.Feedback.init();
