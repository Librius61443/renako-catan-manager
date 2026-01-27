import { html } from 'hono/html';

export const SuccessPage = (username: string, avatarUrl: string, discordId: string, apiKey: string) => html`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Link Account | Renako</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@300;400;600&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          background-color: #0f1115; /* Deep midnight charcoal */
        }
        .mono { font-family: 'JetBrains Mono', monospace; }
        
        /* Subtle glow for Renako's theme */
        .theme-glow {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.1);
        }
      </style>
    </head>
    <body class="flex items-center justify-center min-h-screen m-0 p-4">
      <div class="card bg-[#1a1c23] border border-gray-800 p-8 rounded-2xl text-center shadow-2xl w-full max-w-sm theme-glow">
        <div class="relative inline-block mb-6">
          <img src="${avatarUrl}" alt="Avatar" class="w-20 h-20 rounded-full border-2 border-pink-500 p-1" />
          <div class="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-4 border-[#1a1c23] rounded-full"></div>
        </div>

        <h1 class="text-xl font-semibold text-gray-100 mb-1">Welcome, ${username}</h1>
        <div class="id-badge mono text-[10px] bg-[#0f1115] text-pink-400/80 py-1 px-3 rounded-md inline-block mb-6 border border-pink-900/30">
          ID: ${discordId}
        </div>

        <div class="text-left space-y-3 mb-8">
          <div class="flex items-start gap-3">
            <span class="mono text-pink-500 font-bold">01.</span>
            <p class="text-xs text-gray-400">Install the extension files to your local machine.</p>
          </div>
          <div class="flex items-start gap-3">
            <span class="mono text-pink-500 font-bold">02.</span>
            <p class="text-xs text-gray-400">Enable <span class="text-gray-200 underline decoration-pink-500/50">Developer Mode</span> in Chrome and click "Sync".</p>
          </div>
        </div>

        <div class="space-y-3">
          <a href="chrome://extensions" target="_blank" 
             class="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition-all border border-gray-700">
            Open Extensions
          </a>
          
          <button onclick="linkExtension('${discordId}', '${apiKey}')" 
                  class="block w-full py-3 px-4 bg-pink-600 hover:bg-pink-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-pink-900/20">
            Link to Extension
          </button>
        </div>

      <div id="status-message" class="mt-6 text-center">
        <p class="text-[10px] text-gray-500 italic">
          System: Waiting for handshake...
        </p>
      </div>
    </div>

    <div id="loading-overlay" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-[#1a1c23] border border-pink-600/40 rounded-xl p-8 text-center max-w-sm">
        <div class="mb-6 flex justify-center">
          <div class="relative w-16 h-16">
            <div class="absolute inset-0 rounded-full border-4 border-transparent border-t-pink-500 border-r-pink-500 animate-spin"></div>
            <div class="absolute inset-2 rounded-full border-2 border-pink-900/30"></div>
          </div>
        </div>
        
        <h2 class="text-lg font-semibold text-gray-100 mb-2">Connecting...</h2>
        <p class="text-sm text-gray-400 mb-4">
          Linking your Discord account to the extension
        </p>
        
        <div class="bg-gray-900 rounded-lg p-4 mb-4 border border-gray-800">
          <p class="text-xs text-gray-300 font-mono">
            Check the extension popup for connection confirmation
          </p>
        </div>
        
        <p class="text-[10px] text-gray-500">
          You can close this window once the extension popup shows "Connected"
        </p>
      </div>
    </div>

    <style>
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>

    <script>
      function showLoadingOverlay() {
        document.getElementById('loading-overlay').classList.remove('hidden');
        document.getElementById('status-message').innerHTML = '<p class="text-[10px] text-pink-400 italic font-semibold">✨ Connecting to extension...</p>';
      }

      function hideLoadingOverlay() {
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('status-message').innerHTML = '<p class="text-[10px] text-green-400 italic font-semibold">✅ Connected! Check your extension popup.</p>';
      }

      function showError(message) {
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('status-message').innerHTML = '<p class="text-[10px] text-red-400 italic font-semibold">❌ ' + message + '</p>';
      }

      function linkExtension(discordId, apiKey) {
        const EXTENSION_ID = "opjhadmmncbekdhlfeejiifedndfobjn";
        let attemptCount = 0;
        const maxAttempts = 3;

        showLoadingOverlay();

        function attempt() {
          attemptCount++;
          console.log('Attempt ' + attemptCount + ' to connect to extension...');

          try {
            if (!window.chrome || !chrome.runtime) {
              throw new Error("Chrome runtime not found");
            }

            chrome.runtime.sendMessage(
              EXTENSION_ID,
              {
                type: "SET_CREDENTIALS",
                payload: { discordId, apiKey }
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error("Runtime Error: " + chrome.runtime.lastError.message);
                  
                  if (attemptCount < maxAttempts) {
                    console.log('Retrying in 500ms...');
                    setTimeout(attempt, 500);
                  } else {
                    showError("Extension not detected. Make sure it's installed and enabled.");
                  }
                } else if (response && response.success) {
                  console.log("Handshake successful: ", response);
                  hideLoadingOverlay();
                } else {
                  console.warn("Unexpected response: ", response);
                  if (attemptCount < maxAttempts) {
                    setTimeout(attempt, 500);
                  }
                }
              }
            );
          } catch (e) {
            console.error("Error: ", e);
            if (attemptCount < maxAttempts) {
              setTimeout(attempt, 500);
            } else {
              showError("Connection failed. Are you in Chrome and is the extension installed?");
            }
          }
        }

        attempt();
      }
      </script>
    </body>
  </html>
`;