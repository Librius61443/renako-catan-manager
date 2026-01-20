//Testing version 1.0 of Catan Logger
console.log("[Catan Logger]: Scraper active");

let isProcessingGame = false;
let lastLoggedLobby = null;

function scrapeColonistOutcome() {
    // Select the desktop-specific container to avoid mobile duplicate rows
    const desktopContainer = document.querySelector('div[class*="topTabsContainer"]');
    if (!desktopContainer) {
        console.warn("[Catan Logger]: Desktop container not found");
        return null;
    }

    const lobbyId = window.location.href.split('/').pop() || "unknown";
    
    // Target rows within the desktop container
    const playerRows = desktopContainer.querySelectorAll('div[class*="row-vWs3tVp5"]');
    const gameResults = [];
    const seenNames = new Set();

    playerRows.forEach(row => {
        const nameEl = row.querySelector('div[class*="name-"]');
        const vpEl = row.querySelector('div[class*="victoryPoint-"]');

        if (nameEl && vpEl) {
            const playerName = nameEl.innerText.trim();
            
            // Prevent duplicate entries from the same table
            if (!seenNames.has(playerName)) {
                seenNames.add(playerName);
                gameResults.push({
                    name: playerName,
                    vp: parseInt(vpEl.innerText) || 0,
                    isBot: !!row.querySelector('img[src*="icon_bot"]'),
                    isWinner: !!row.querySelector('img[src*="icon_trophy"]')
                });
            }
        }
    });

    if (gameResults.length === 0) return null;

    // Identify winner via trophy icon or maximum victory points
    const winner = gameResults.find(p => p.isWinner) || 
                   gameResults.reduce((prev, curr) => (prev.vp > curr.vp) ? prev : curr);

    return {
        lobbyId,
        winnerName: winner.name,
        players: gameResults,
        timestamp: new Date().toISOString()
    };
}

const observer = new MutationObserver(() => {
    const modal = document.querySelector('div[class*="contentContainer"]'); 
    const currentLobby = window.location.href.split('/').pop();

    // Logic lock ensures only one request per lobby session
    if (modal && !isProcessingGame && currentLobby !== lastLoggedLobby) {
        isProcessingGame = true;
        lastLoggedLobby = currentLobby;

        console.log("[Catan Logger]: Modal detected. Processing scrape...");

        // Delay execution to ensure React DOM reconciliation is complete
        setTimeout(() => {
            const gameData = scrapeColonistOutcome();
            
            if (gameData && gameData.players.length > 0) {
                console.log("Data extracted. Sending to Hono:", gameData);

                fetch('http://localhost:3000/api/ingest', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(gameData)
                })
                .then(res => {
                    console.log("Hono Status:", res.status);
                    // Lock remains true for this lobby to prevent duplicate POSTs
                })
                .catch(err => {
                    console.error("Transmission error:", err);
                    // Reset lock on failure to allow manual retry or re-observation
                    isProcessingGame = false;
                    lastLoggedLobby = null;
                });
            } else {
                isProcessingGame = false;
                lastLoggedLobby = null;
            }
        }, 1500); 
    }
});

observer.observe(document.body, { childList: true, subtree: true });