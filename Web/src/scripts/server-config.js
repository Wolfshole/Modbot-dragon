// Server Configuration Page Script

// Get server ID from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const serverId = urlParams.get('id');

// Elements
const menuItems = document.querySelectorAll('.menu-item');
const contentSections = document.querySelectorAll('.content-section');

// Navigation between sections
menuItems.forEach(item => {
	item.addEventListener('click', (e) => {
		e.preventDefault();
		const section = item.dataset.section;
		
		// Remove active class from all items and sections
		menuItems.forEach(i => i.classList.remove('active'));
		contentSections.forEach(s => s.style.display = 'none');
		
		// Add active class to clicked item
		item.classList.add('active');
		
		// Show corresponding section
		const targetSection = document.getElementById(`${section}-section`);
		if (targetSection) {
			targetSection.style.display = 'block';
		}
	});
});

// Load server data
async function loadServerData() {
	try {
		// Get server info from localStorage or API
		const serverData = getServerDataFromStorage(serverId) || await fetchServerData(serverId);
		
		if (serverData) {
			// Update page title
			document.title = `${serverData.name} - Dragon Modbot`;
			
			// Update server info in header
			document.getElementById('server-title').textContent = serverData.name;
			document.getElementById('server-name-nav').textContent = serverData.name;
			document.getElementById('sidebar-server-name').textContent = serverData.name;
			document.getElementById('member-count').textContent = `${serverData.memberCount || 0} Mitglieder`;
			document.getElementById('stat-members').textContent = serverData.memberCount || 0;
			
			// Update server icon
			const serverIcon = document.getElementById('server-icon');
			const serverInitials = document.getElementById('server-initials');
			
			if (serverData.icon) {
				serverIcon.style.backgroundImage = `url(https://cdn.discordapp.com/icons/${serverId}/${serverData.icon}.png)`;
				serverIcon.style.backgroundSize = 'cover';
				serverInitials.textContent = '';
			} else {
				serverInitials.textContent = getServerInitials(serverData.name);
			}
		}
	} catch (error) {
		console.error('Error loading server data:', error);
	}
}

// Get server data from localStorage
function getServerDataFromStorage(serverId) {
	const data = localStorage.getItem(`server_${serverId}`);
	return data ? JSON.parse(data) : null;
}

// Fetch server data from API
async function fetchServerData(serverId) {
	try {
		const response = await fetch(`/api/guilds/${serverId}`);
		const data = await response.json();
		
		// Store in localStorage
		localStorage.setItem(`server_${serverId}`, JSON.stringify(data));
		
		return data;
	} catch (error) {
		console.error('Error fetching server data:', error);
		return {
			name: 'Server',
			memberCount: 0
		};
	}
}

// Get server initials
function getServerInitials(name) {
	return name
		.split(' ')
		.map(word => word[0])
		.join('')
		.toUpperCase()
		.substring(0, 2);
}

// Module toggle handlers
document.querySelectorAll('[data-module]').forEach(toggle => {
	toggle.addEventListener('change', (e) => {
		const module = e.target.dataset.module;
		const enabled = e.target.checked;
		
		console.log(`Module ${module} ${enabled ? 'enabled' : 'disabled'}`);
		
		// TODO: Save to API
		// saveModuleState(serverId, module, enabled);
	});
});

// Configure buttons
document.querySelectorAll('.btn-configure').forEach(button => {
	button.addEventListener('click', (e) => {
		const moduleCard = e.target.closest('.module-card');
		const moduleName = moduleCard.querySelector('h3').textContent;
		
		console.log(`Configure ${moduleName}`);
		// TODO: Open configuration modal or navigate to config page
	});
});

// Save settings button
const saveSettingsBtn = document.getElementById('save-settings-btn');
if (saveSettingsBtn) {
	saveSettingsBtn.addEventListener('click', async () => {
		// Get settings values
		const embedColor = document.getElementById('embed-color')?.value || '#5865F2';
		const language = document.getElementById('language-select')?.value || 'de';
		const timezone = document.getElementById('timezone-select')?.value || 'Europe/Berlin';
		
		const settings = {
			embedColor,
			language,
			timezone
		};
		
		try {
			// Show loading state
			saveSettingsBtn.disabled = true;
			saveSettingsBtn.textContent = '💾 Speichern...';
			
			// Save to localStorage
			localStorage.setItem(`server_${serverId}_settings`, JSON.stringify(settings));
			
			// TODO: Send to API
			// await fetch(`/api/guilds/${serverId}/settings`, {
			//   method: 'POST',
			//   headers: { 'Content-Type': 'application/json' },
			//   body: JSON.stringify(settings)
			// });
			
			// Success feedback
			saveSettingsBtn.textContent = '✅ Gespeichert!';
			saveSettingsBtn.style.background = 'linear-gradient(135deg, #43b581 0%, #3ca374 100%)';
			
			setTimeout(() => {
				saveSettingsBtn.disabled = false;
				saveSettingsBtn.textContent = '💾 Einstellungen speichern';
				saveSettingsBtn.style.background = '';
			}, 2000);
			
		} catch (error) {
			console.error('Error saving settings:', error);
			
			// Error feedback
			saveSettingsBtn.textContent = '❌ Fehler beim Speichern';
			saveSettingsBtn.style.background = 'linear-gradient(135deg, #f04747 0%, #d84040 100%)';
			
			setTimeout(() => {
				saveSettingsBtn.disabled = false;
				saveSettingsBtn.textContent = '💾 Einstellungen speichern';
				saveSettingsBtn.style.background = '';
			}, 2000);
		}
	});
}

// Load saved settings
function loadSavedSettings() {
	const savedSettings = localStorage.getItem(`server_${serverId}_settings`);
	if (savedSettings) {
		try {
			const settings = JSON.parse(savedSettings);
			
			// Apply saved settings
			if (settings.embedColor) {
				const colorInput = document.getElementById('embed-color');
				if (colorInput) colorInput.value = settings.embedColor;
			}
			if (settings.language) {
				const languageSelect = document.getElementById('language-select');
				if (languageSelect) languageSelect.value = settings.language;
			}
			if (settings.timezone) {
				const timezoneSelect = document.getElementById('timezone-select');
				if (timezoneSelect) timezoneSelect.value = settings.timezone;
			}
		} catch (error) {
			console.error('Error loading saved settings:', error);
		}
	}
}

// Initialize
loadServerData();
loadSavedSettings();
