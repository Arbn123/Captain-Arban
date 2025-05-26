
// S'exécute une fois à l'installation de l'extension
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installée.");
});


function queryTabsAsync(queryInfo) {
    return new Promise((resolve) => {
        chrome.tabs.query(queryInfo, (tabs) => {
            resolve(tabs);
        });
    });
}

// Fonction d'attente asynchrone (ici 3 secondes)
function waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fonction principale : écoute les messages envoyés par content.js
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    // Vérifie que l'extension est toujours active
    if (!chrome.runtime) {
        console.error("Contexte d'extension invalide.");
        return;
    }

    //console.log(message.action);
    //console.log(message.videoUrl);
    // Attendre 3 secondes pour laisser le temps de stabiliser l'URL ou la page
    await waitFor(3000);

    // Si le message reçu demande un téléchargement
    if (message.action === 'downloadVideoYoutube' && message.videoUrl) {
        console.log("Requête de téléchargement reçue pour :", message.videoUrl);

        try {
            // Appel à l'API Flask locale qui doit déjà être démarrée (via start_flask.py)
            //console.log("On s'apprête à envoyer une requête au Backend");
            const response = await fetch("http://localhost:5050/download_youtube", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                // On envoie l'URL de la vidéo dans le corps de la requête
                body: JSON.stringify({ url: message.videoUrl })
            });
            
            //console.log("message.videoUrl=",message.videoUrl);
            const data = await response.json();
            //console.log("data=",data);

            // Si la réponse du backend est un succès
            if (data.status === 'success') {
                //console.log("Vidéo téléchargée :", data.title);
                sendResponse({ success: true, title: data.title });
            } else {
                // Si le backend a retourné une erreur
                console.error("Erreur renvoyée par Flask :", data.error);
                sendResponse({ success: false, error: data.error });
            }

        } catch (error) {
            // Erreur réseau ou serveur indisponible
            console.error("Erreur de communication avec Flask :", error);
            sendResponse({ success: false, error: "Erreur réseau ou backend injoignable" });
        }
    }
    
    else if (message.action === 'downloadVideotwitter' && message.videoUrl) {
        //console.log("Requête de téléchargement Twitter reçue pour :", message.videoUrl);
        //console.log("message.videoUrl=",message.videoUrl);
        
        try {
            /*
            const response = await fetch("http://localhost:5050/download_twitter_video", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url: message.videoUrl })
            })
            
            
            if (!response.ok) {
                console.error("Erreur lors du téléchargement :", response.statusText);
                return;
            }

            // Transforme la réponse en blob
            const blob = await response.blob();
            console.log("blob=",blob);
            
            async function sendBlobToActiveTab(base64Data) {
                console.log("fonction sendBlobToActiveTab engagée");
                const tabs = await queryTabsAsync({ active: true, currentWindow: true });
                if (!tabs.length) return;
                
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "downloadBase64",
                    base64: base64Data
                });
                }
                        
            // Convertir le blob en base64
            const reader = new FileReader();
            console.log("reader=",reader);
            
            reader.onloadend = () => {
            console.log("1111111");
            const base64Data = reader.result; // => data:video/mp4;base64,....
            //console.log("base64Data=",base64Data);
            console.log("fonction sendBlobToActiveTab va bientot etre lancée");
            // Envoi au content.js
            sendBlobToActiveTab(base64Data);
            console.log("fonction sendBlobToActiveTab exécutée");
            };
            
            reader.readAsDataURL(blob); 
            */

            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "downloadBlob", blob: blob });
                });
            
         }
         catch (error) {
            console.error("Erreur réseau Twitter / backend :", error);
            sendResponse({ success: false, error: "Erreur réseau ou backend Twitter injoignable" });
        }
    }  

    // Indique à Chrome qu'on utilise sendResponse de manière asynchrone
    return true;
});

