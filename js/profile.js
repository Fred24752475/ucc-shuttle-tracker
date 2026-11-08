function savedAccount() {
    try { return JSON.parse(localStorage.getItem('ucc_user') || 'null'); }
    catch (error) { return null; }
}

const DEFAULT_USER_ICON = '/images/default-user.svg';

function paintAccountPhoto(url) {
    const photo = url && !/gravatar\.com|ui-avatars\.com/.test(url) ? url : DEFAULT_USER_ICON;
    document.querySelectorAll('.user-avatar img, .profile-avatar img, #profileAvatar').forEach((img) => {
        img.src = photo;
        img.onerror = () => { img.onerror = null; img.src = DEFAULT_USER_ICON; };
    });
}

function paintAccountName(name) {
    if (!name) return;
    ['userName', 'studentName', 'driverName', 'adminName', 'supportName', 'profileDisplayName', 'profileName'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = name;
    });
}

function paintAccountEmail(email) {
    if (!email) return;
    const el = document.getElementById('profileDisplayEmail');
    if (el) el.textContent = email;
}

window.showProfilePane = function (name) {
    document.querySelectorAll('#profileSection .me-pane').forEach((pane) => {
        pane.hidden = pane.getAttribute('data-pane') !== name;
    });
};

function rememberAccount(user) {
    const current = savedAccount() || {};
    const next = { ...current, ...user };
    if (!user.profileImage && current.profileImage) next.profileImage = current.profileImage;
    if (!user.name && current.name) next.name = current.name;
    localStorage.setItem('ucc_user', JSON.stringify(next));
    paintAccountPhoto(next.profileImage);
    paintAccountName(next.name);
    paintAccountEmail(next.email);
}

async function loadAccount() {
    const token = localStorage.getItem('ucc_token');
    const cached = savedAccount();
    if (cached) {
        paintAccountPhoto(cached.profileImage);
        paintAccountName(cached.name);
        paintAccountEmail(cached.email);
    }
    if (!token) return cached;
    const response = await fetch('/api/users/profile', { headers: { Authorization: 'Bearer ' + token } });
    const data = await response.json();
    if (data.success && data.profile) rememberAccount(data.profile);
    return data.profile;
}

async function uploadAccountPhoto(file) {
    const token = localStorage.getItem('ucc_token');
    const body = new FormData();
    body.append('image', file);
    const response = await fetch('/api/users/avatar', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Could not save photo');
    rememberAccount(data.user);
    return data.user;
}

async function changeAccountPassword(currentPassword, newPassword) {
    const token = localStorage.getItem('ucc_token');
    const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Could not change password');
    return data;
}

document.addEventListener('DOMContentLoaded', () => {
    loadAccount().catch(() => {});
    const photo = document.getElementById('profilePhoto');
    if (photo) {
        photo.addEventListener('change', async () => {
            if (!photo.files[0]) return;
            try {
                await uploadAccountPhoto(photo.files[0]);
            } catch (error) {
                alert(window.readableProblem ? window.readableProblem(error) : 'That could not be saved. Try again.');
            }
        });
    }
    const passwordForm = document.getElementById('studentPasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const currentPassword = document.getElementById('studentCurrentPassword').value;
            const next = document.getElementById('studentNewPassword').value;
            const confirm = document.getElementById('studentConfirmPassword').value;
            if (next !== confirm) return alert('Passwords do not match');
            try {
                await changeAccountPassword(currentPassword, next);
                passwordForm.reset();
                showProfilePane('home');
            } catch (error) {
                alert(window.readableProblem ? window.readableProblem(error) : 'That could not be saved. Try again.');
            }
        });
    }
    const details = document.getElementById('studentProfileForm');
    if (details) {
        details.addEventListener('submit', async (event) => {
            event.preventDefault();
            const token = localStorage.getItem('ucc_token');
            const response = await fetch('/api/student/profile', {
                method: 'PUT',
                headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('studentProfileName').value,
                    phone: document.getElementById('studentProfilePhone').value,
                    department: document.getElementById('studentProfileDepartment').value
                })
            });
            const data = await response.json();
            if (!data.success) return alert(data.message || 'Could not save profile');
            rememberAccount(data.profile);
            showProfilePane('home');
        });
        loadAccount().then((profile) => {
            if (!profile) return;
            const set = (id, value) => { const el = document.getElementById(id); if (el && value) el.value = value; };
            set('studentProfileName', profile.name);
            set('studentProfilePhone', profile.phone);
            set('studentProfileDepartment', profile.department);
            const email = document.getElementById('studentProfileEmail');
            if (email) email.value = profile.email || '';
        }).catch(() => {});
    }
});
