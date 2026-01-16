// Role Protection - Prevent unauthorized dashboard access
(function() {
    const currentPage = window.location.pathname;
    const userData = localStorage.getItem('ucc_user');
    
    if (!userData) {
        // Not logged in - redirect to home
        console.log('❌ No user data found - redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    const user = JSON.parse(userData);
    const userRole = user.role;
    
    console.log(`🔐 Role Protection: User role is "${userRole}"`);
    
    // Check if user is on correct dashboard
    if (currentPage.includes('student-dashboard') && userRole !== 'student') {
        alert(`❌ Access Denied!\n\nYou are logged in as ${userRole}.\nRedirecting to your dashboard...`);
        window.location.href = userRole + '-dashboard.html';
    }
    else if (currentPage.includes('driver-dashboard') && userRole !== 'driver') {
        alert(`❌ Access Denied!\n\nYou are logged in as ${userRole}.\nRedirecting to your dashboard...`);
        window.location.href = userRole + '-dashboard.html';
    }
    else if (currentPage.includes('admin-dashboard') && userRole !== 'admin') {
        alert(`❌ Access Denied!\n\nYou are logged in as ${userRole}.\nRedirecting to your dashboard...`);
        window.location.href = userRole + '-dashboard.html';
    }
    else {
        console.log('✅ Role protection passed - user on correct dashboard');
    }
})();
