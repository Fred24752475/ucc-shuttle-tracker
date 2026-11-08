function savedAccount() {
    try { return JSON.parse(localStorage.getItem('ucc_user') || 'null'); }
    catch (error) { return null; }
}

function paintAccountPhoto(url) {
    if (!url) return;
    document.querySelectorAll('.user-avatar img, .profile-avatar img, #profileAvatar').forEach((img) => {
        img.src = url;
    });
}

function rememberAccount(user) {
    const current = savedAccount() || {};
    const next = { ...current, ...user };
    if (!user.profileImage && current.profileImage) next.profileImage = current.profileImage;
    localStorage.setItem('ucc_user', JSON.stringify(next));
    paintAccountPhoto(next.profileImage);
    const name = document.getElementById('userName');
    if (name && next.name) name.textContent = next.name;
}

async function loadAccount() {
    const token = localStorage.getItem('ucc_token');
    const cached = savedAccount();
    if (cached) paintAccountPhoto(cached.profileImage);
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
                alert(error.message);
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
                alert('Password changed');
            } catch (error) {
                alert(error.message);
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
            alert('Profile saved');
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
