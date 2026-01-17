// Modern Mobile Bottom Navigation Handler
document.addEventListener('DOMContentLoaded', () => {
    const bottomNavItems = document.querySelectorAll('.nav-item-mobile');
    const sections = {
        'dashboard': document.getElementById('dashboardMain'),
        'rides': document.getElementById('ridesSection'),
        'map': document.getElementById('mapSection'),
        'messages': document.getElementById('messagesSection'),
        'ai-assistant': document.getElementById('aiAssistantSection'),
        'history': document.getElementById('historySection'),
        'help': document.getElementById('helpSection')
    };

    // Handle bottom nav clicks
    bottomNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionName = item.getAttribute('data-section');
            
            // Remove active class from all items
            bottomNavItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            item.classList.add('active');
            
            // Hide all sections
            Object.values(sections).forEach(section => {
                if (section) section.style.display = 'none';
            });
            
            // Show selected section
            if (sections[sectionName]) {
                sections[sectionName].style.display = 'block';
                
                // Initialize section-specific features
                if (sectionName === 'messages' && window.friendsSystem) {
                    setTimeout(() => friendsSystem.init(), 100);
                }
                
                if (sectionName === 'map' && window.initializeSimpleMap) {
                    setTimeout(() => window.initializeSimpleMap(), 100);
                }
            }
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Also handle sidebar navigation clicks for mobile
    const sidebarNavItems = document.querySelectorAll('.nav-item');
    sidebarNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionName = item.getAttribute('data-section');
            
            // Update bottom nav active state
            bottomNavItems.forEach(nav => {
                if (nav.getAttribute('data-section') === sectionName) {
                    nav.classList.add('active');
                } else {
                    nav.classList.remove('active');
                }
            });
            
            // Close sidebar on mobile
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobileOverlay');
            if (sidebar) sidebar.classList.remove('active');
            if (overlay) overlay.classList.remove('active');
        });
    });
});
