import './style.css';

// 1. Define the storage interface to satisfy TypeScript
interface RenakoStorage {
  apiKey?: string;
  discordId?: string;
  connectionTimestamp?: number;
}

// const trackBtn = document.getElementById('track-btn') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect-btn') as HTMLButtonElement;
const statusText = document.getElementById('game-state')!;
const dot = document.getElementById('status-dot')!;
const accountSection = document.getElementById('account-section')!;
const connectionStatus = document.getElementById('connection-status')!;
const connectingStatus = document.getElementById('connecting-status')!;
const displayId = document.getElementById('display-id')!;

// --- 1. UI REFRESH LOGIC ---
function updateUI(apiKey?: string, discordId?: string) {
  if (apiKey) {
    // Connected State (Pink glow)
    dot.className = "w-2.5 h-2.5 bg-[#ff79c6] rounded-full shadow-[0_0_10px_rgba(255,121,198,0.6)] border border-[#1a0f14]";
    statusText.innerText = "System: Online & Ready";
    
    // Ensure we handle class replacement safely
    statusText.classList.remove('text-pink-300/70');
    statusText.classList.add('text-pink-300');
    
    connectingStatus.classList.add('hidden');
    connectionStatus.classList.remove('hidden');
    accountSection.classList.remove('hidden');
    disconnectBtn.classList.remove('hidden');
    displayId.innerText = discordId || "Unknown User";
    // trackBtn.disabled = false;
  } else {
    // Disconnected State
    dot.className = "w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.6)] border border-[#1a0f14]";
    statusText.innerText = "Handshake Required";
    
    statusText.classList.remove('text-pink-300');
    statusText.classList.add('text-pink-300/70');
    
    connectingStatus.classList.add('hidden');
    connectionStatus.classList.add('hidden');
    accountSection.classList.add('hidden');
    disconnectBtn.classList.add('hidden');
    // trackBtn.disabled = true;
  }
}

// --- 1b. SHOW CONNECTING STATE ---
function showConnecting() {
  connectingStatus.classList.remove('hidden');
  connectionStatus.classList.add('hidden');
  dot.className = "w-2.5 h-2.5 bg-[#ff79c6] rounded-full shadow-[0_0_12px_rgba(255,121,198,0.8)] border border-[#1a0f14] animate-pulse";
  statusText.innerText = "Establishing connection...";
  statusText.classList.remove('text-pink-300');
  statusText.classList.add('text-pink-300/70');
}

// --- 1c. SHOW SUCCESS ANIMATION ---
function showSuccessAnimation() {
  // Create success pulse effect
  const successPulse = document.createElement('div');
  successPulse.className = 'fixed top-0 left-0 w-full h-full pointer-events-none';
  successPulse.style.cssText = `
    background: radial-gradient(circle, rgba(255,121,198,0.3) 0%, transparent 70%);
    animation: successPulse 0.8s ease-out;
  `;
  document.body.appendChild(successPulse);
  
  setTimeout(() => successPulse.remove(), 800);
  
  // Animate the status indicator
  dot.style.animation = 'none';
  setTimeout(() => {
    dot.style.animation = 'successBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }, 10);
}

// --- 2. INITIAL LOAD ---
chrome.storage.local.get(['apiKey', 'discordId', 'connectionTimestamp'], (result) => {
  const data = result as RenakoStorage;
  
  // Check if this is a fresh connection (within last 5 seconds)
  const isFreshConnection = data.connectionTimestamp && 
    (Date.now() - data.connectionTimestamp) < 5000;
  
  if (isFreshConnection && data.apiKey && data.discordId) {
    // Show the connection animation sequence
    showConnecting();
    setTimeout(() => {
      showSuccessAnimation();
      updateUI(data.apiKey, data.discordId);
    }, 800);
    
    // Clear the timestamp after showing animation
    chrome.storage.local.remove('connectionTimestamp');
  } else {
    // Normal load - just show current state
    updateUI(data.apiKey, data.discordId);
  }
});

// --- 3. LISTEN FOR CHANGES (Live updates) ---
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    // Show connecting state when we detect a change
    if (changes.apiKey || changes.discordId) {
      showConnecting();
      
      // Wait a brief moment before showing the full connected state
      setTimeout(() => {
        chrome.storage.local.get(['apiKey', 'discordId'], (result) => {
          const data = result as RenakoStorage;
          
          // Show success animation when credentials are received
          if (data.apiKey && data.discordId) {
            showSuccessAnimation();
          }
          
          updateUI(data.apiKey, data.discordId);
        });
      }, 800);
    }
  }
});

// --- 4. LISTEN FOR CONNECTION SUCCESS FROM BACKGROUND ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONNECTION_SUCCESS') {
    console.log('🎉 Connection success message received:', message.discordId);
    // This will trigger the storage listener which handles animations
  }
});

// --- 5. DISCONNECT LOGIC ---
disconnectBtn.addEventListener('click', () => {
  if (confirm("Disconnect Renako? This will clear your API session.")) {
    chrome.storage.local.remove(['apiKey', 'discordId'], () => {
      // Notify background script to update icon
      chrome.runtime.sendMessage({ type: 'DISCONNECTED' });
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