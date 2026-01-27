import './style.css';

// 1. Define the storage interface to satisfy TypeScript
interface RenakoStorage {
  apiKey?: string;
  discordId?: string;
}

// const trackBtn = document.getElementById('track-btn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const statusText = document.getElementById('game-state')!;
const dot = document.getElementById('status-dot')!;
const accountSection = document.getElementById('account-section')!;
const displayId = document.getElementById('display-id')!;

// --- 1. UI REFRESH LOGIC ---
function updateUI(apiKey?: string, discordId?: string) {
  if (apiKey) {
    // Connected State (Green glow for the pink theme)
    dot.className = "w-2.5 h-2.5 bg-[#50fa7b] rounded-full shadow-[0_0_10px_rgba(80,250,123,0.5)] border border-[#1a0f14]";
    statusText.innerText = "System: Online & Ready";
    
    // Ensure we handle class replacement safely
    statusText.classList.remove('text-pink-200/50');
    statusText.classList.add('text-pink-400');
    
    accountSection.classList.remove('hidden');
    disconnectBtn.classList.remove('hidden');
    displayId.innerText = discordId || "Unknown User";
    // trackBtn.disabled = false;
  } else {
    // Disconnected State
    dot.className = "w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] border border-[#1a0f14]";
    statusText.innerText = "Handshake Required";
    
    statusText.classList.remove('text-pink-400');
    statusText.classList.add('text-pink-200/50');
    
    accountSection.classList.add('hidden');
    disconnectBtn.classList.add('hidden');
    // trackBtn.disabled = true;
  }
}

// --- 2. INITIAL LOAD ---
chrome.storage.local.get(['apiKey', 'discordId'], (result) => {
  const data = result as RenakoStorage;
  updateUI(data.apiKey, data.discordId);
});

// --- 3. LISTEN FOR CHANGES (Live updates) ---
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    chrome.storage.local.get(['apiKey', 'discordId'], (result) => {
      const data = result as RenakoStorage;
      updateUI(data.apiKey, data.discordId);
    });
  }
});

// --- 4. DISCONNECT LOGIC ---
disconnectBtn.addEventListener('click', () => {
  if (confirm("Disconnect Renako? This will clear your API session.")) {
    chrome.storage.local.remove(['apiKey', 'discordId'], () => {
      updateUI();
    });
  }
});

// // --- 5. TRACKING TRIGGER ---
// trackBtn.addEventListener('click', async () => {
//   statusText.innerText = "Scanning Game Board...";
  
//   const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   if (tab?.id) {
//     chrome.tabs.sendMessage(tab.id, { type: "GET_STATS" }, (response) => {
//       if (chrome.runtime.lastError || !response) {
//         statusText.innerText = "Error: Catan Not Found";
//       } else {
//         statusText.innerText = "Stats Sent to Backend!";
//       }
//     });
//   }
// });