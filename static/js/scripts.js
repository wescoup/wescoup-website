// Variable to store the install event
let deferredPrompt;

// 1. Listen for the "Installable" signal from Chrome
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show your custom install card on index.html
    const installContainer = document.getElementById('install-container');
    if (installContainer) {
        installContainer.style.display = 'block';
    }
});

// 2. Handle the button click
document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'install-button') {
        const installButton = e.target;
        const installStatus = document.getElementById('install-status');
        
        if (deferredPrompt) {
            deferredPrompt.prompt();
            
            // UI Feedback to prevent the "6-Pack" of icons
            if (installStatus) {
                installStatus.textContent = "Google is building your app... please wait a moment for the icon to appear.";
                installStatus.style.display = 'block';
            }
            
            installButton.disabled = true;
            installButton.style.opacity = '0.5';

            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User Choice: ${outcome}`);
            deferredPrompt = null;
        }
    }
});

// 3. Hide UI when finished
window.addEventListener('appinstalled', () => {
    const installContainer = document.getElementById('install-container');
    if (installContainer) installContainer.style.display = 'none';
});
