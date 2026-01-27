// Discord OAuth and API Integration
const serverGrid = document.getElementById('server-grid');
const configPanel = document.getElementById('config-panel');
const saveButton = document.getElementById('save-config');
const saveStatus = document.getElementById('save-status');
const serverNameDisplay = document.getElementById('server-name');
const greetingUsername = document.getElementById('greeting-username');
const username = document.getElementById('username');

let selectedServerId = null;
let userAccessToken = null;

// Function to load user's Discord servers in Galaxy Bot style
async function loadUserDiscordServers() {
	if (!serverGrid) return;
	
	serverGrid.innerHTML = '<p class="loading">Lade deine Discord Server...</p>';
	
	try {
		// Fetch guilds from API
		const guilds = await fetchUserGuildsFromDiscord();
		
		if (guilds.length === 0) {
			serverGrid.innerHTML = `
				<div style="text-align: center; padding: 3rem; color: #b9bbbe; grid-column: 1/-1;">
					<p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Keine Server gefunden</p>
					<p style="font-size: 0.9rem;">
						Der Bot muss erst auf deinen Servern hinzugefügt werden.
					</p>
				</div>
			`;
			return;
		}
		
		serverGrid.innerHTML = guilds.map(guild => {
			const memberCount = guild.approximate_member_count || Math.floor(Math.random() * 1000) + 100;
			const isOnline = Math.random() > 0.2; // 80% online chance
			
			return `
			<div class="server-card" data-server-id="${guild.id}" data-server-name="${guild.name}">
				<div class="server-card-header">
					<div class="server-icon">
						${guild.icon 
							? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png" alt="${guild.name}">` 
							: getServerInitials(guild.name)
						}
					</div>
					<div class="server-card-title">
						<h3>${guild.name}</h3>
						<p>${memberCount} Mitglieder</p>
					</div>
				</div>
				<div class="server-card-footer">
					<div class="server-members">
						<svg viewBox="0 0 24 24">
							<path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
						</svg>
						${memberCount}
					</div>
					<div class="server-status ${isOnline ? 'online' : 'offline'}">
						● ${isOnline ? 'ONLINE' : 'OFFLINE'}
					</div>
				</div>
			</div>
			`;
		}).join('');

		// Add click handlers
		document.querySelectorAll('.server-card').forEach(card => {
			card.addEventListener('click', () => {
				const serverId = card.dataset.serverId;
				const serverName = card.dataset.serverName;
				if (serverId) {
					// Store server data in localStorage
					const memberCount = card.querySelector('.server-members').textContent.trim();
					const serverData = {
						id: serverId,
						name: serverName,
						memberCount: parseInt(memberCount) || 0,
						icon: null // Will be fetched from API
					};
					localStorage.setItem(`server_${serverId}`, JSON.stringify(serverData));
					
					// Redirect to server config page with query parameter
					window.location.href = `/server?id=${serverId}`;
				}
			});
		});
	} catch (error) {
		console.error('Error loading Discord servers:', error);
		serverGrid.innerHTML = `
			<div style="text-align: center; padding: 3rem; color: #f04747; grid-column: 1/-1;">
				<p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Fehler beim Laden der Server</p>
				<p style="font-size: 0.9rem;">
					Bitte melde dich erneut an.
				</p>
			</div>
		`;
	}
}

// Simulate fetching guilds from Discord API
async function fetchUserGuildsFromDiscord() {
	return new Promise((resolve) => {
		setTimeout(() => {
			fetch('/api/guilds')
				.then(res => res.json())
				.then(guilds => resolve(guilds))
				.catch(err => {
					console.error('Error fetching guilds:', err);
					// Fallback: Zeige zumindest den Test-Server an
					resolve([
						{
							id: '1316837584592441447',
							name: 'Test Server',
							icon: null,
							approximate_member_count: null
						}
					]);
				});
		}, 500);
	});
}

// Get initials from server name for default icon
function getServerInitials(name) {
	return name
		.split(' ')
		.map(word => word[0])
		.join('')
		.substring(0, 3)
		.toUpperCase();
}

// Load user's servers on page load
// TODO: Check if user is authenticated first
loadUserDiscordServers();

function loadServerConfig(serverId, serverName) {
	selectedServerId = serverId;
	
	if (!configPanel) return;
	
	// Show config panel and update server name
	configPanel.style.display = 'block';
	const welcomeBanner = document.querySelector('.welcome-banner');
	if (welcomeBanner) welcomeBanner.style.display = 'none';
	
	if (serverNameDisplay) {
		serverNameDisplay.textContent = `Server: ${serverName}`;
	}
	
	// Load channels for the selected server
	// TODO: Fetch real channels from Discord API
	// GET https://discord.com/api/guilds/{guild.id}/channels
	loadServerChannels(serverId);
	
	// Load existing config from backend
	loadExistingConfig(serverId);
}

async function loadServerChannels(serverId) {
	const channelSelect = document.getElementById('modlog-channel');
	if (!channelSelect) return;
	
	channelSelect.innerHTML = '<option value="">Lade Kanäle...</option>';
	
	try {
		// TODO: Replace with actual Discord API call
		// const response = await fetch(`/api/guilds/${serverId}/channels`);
		// const channels = await response.json();
		
		// Simulate loading channels
		await new Promise(resolve => setTimeout(resolve, 500));
		
		// This should be replaced with real Discord channels
		const channels = [
			// Example format: { id: '123', name: 'mod-logs', type: 0 } // type 0 = text channel
		];
		
		if (channels.length === 0) {
			channelSelect.innerHTML = `
				<option value="">-- Keine Text-Kanäle gefunden --</option>
			`;
		} else {
			channelSelect.innerHTML = `
				<option value="">-- Kanal wählen --</option>
				${channels.map(channel => `
					<option value="${channel.id}">${channel.name}</option>
				`).join('')}
			`;
		}
	} catch (error) {
		console.error('Error loading channels:', error);
		channelSelect.innerHTML = '<option value="">Fehler beim Laden der Kanäle</option>';
	}
}

function loadExistingConfig(serverId) {
	// Load saved configuration from backend
	// TODO: Implement API call to get server configuration
	// const response = await fetch(`/api/config/${serverId}`);
	// const config = await response.json();
	// Apply config to form fields
	
	console.log(`Loading config for server ${serverId}`);
	
	// Reset all toggles to default
	document.querySelectorAll('[data-command]').forEach(input => {
		if (input.type === 'checkbox') {
			input.checked = true; // Default: all commands enabled
		}
	});
}

// Save configuration
saveButton?.addEventListener('click', async () => {
	if (!saveStatus) return;
	if (!selectedServerId) {
		saveStatus.textContent = '⚠️ Bitte wähle zuerst einen Server aus!';
		saveStatus.className = 'save-status error';
		return;
	}
	
	saveStatus.textContent = 'Speichere Konfiguration...';
	saveStatus.className = 'save-status';

	// Collect all settings
	const config = {
		serverId: selectedServerId,
		commands: {},
		options: {}
	};

	// Collect command toggles
	document.querySelectorAll('[data-command]').forEach(input => {
		if (input.type === 'checkbox' && input.dataset.command) {
			config.commands[input.dataset.command] = input.checked;
		}
	});

	// Collect command options
	document.querySelectorAll('[data-command-option]').forEach(input => {
		const option = input.dataset.commandOption;
		if (option) {
			config.options[option] = input.type === 'checkbox' ? input.checked : input.value;
		}
	});

	console.log('Saving configuration:', config);

	// Save to backend API
	// TODO: Implement actual API call
	// const response = await fetch('/api/config/save', {
	//     method: 'POST',
	//     headers: { 'Content-Type': 'application/json' },
	//     body: JSON.stringify(config)
	// });
	
	// Simulate API call to save configuration
	setTimeout(() => {
		saveStatus.textContent = '✅ Konfiguration erfolgreich gespeichert!';
		saveStatus.className = 'save-status success';
		
		// Auto-hide success message after 3 seconds
		setTimeout(() => {
			saveStatus.textContent = '';
			saveStatus.className = 'save-status';
		}, 3000);
	}, 1500);
});
