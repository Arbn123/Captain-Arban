
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


//Bouton clic-droit télécharger cette vidéo
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "downloadYoutubeVideoRight",
    title: "Télécharger cette vidéo",
    contexts: ["video","link", "all"]
  });
});

/*
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("11111111");
  if (info.menuItemId === "downloadYoutubeVideoRight") { 
    console.log("2222222");
    chrome.tabs.sendMessage(tab.id, { action: "getVideoUrl" });
    console.log("3333");
    }
  
});     */ 


chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "sendVideoUrl") {
    
    const videoUrl = message.videoUrl;

    // Ici tu peux lancer la suite : appel backend, téléchargement, etc.
    const response = await fetch("http://localhost:5050/download_youtube", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: videoUrl })
    });
    console.log("response=",response);
    }
});


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

    // Si le message reçu demande un téléchargement Youtube
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
    //On n'a pas besoin de partie pour le téléchargement Twitter car ce dernier se produit dans content.js
    //elseif prend juste en compte l'envoi d'une icone de confirmation du téléchargement Twitter 
    else if (message.type === 'download_complete') {
        //console.log("Requête de téléchargement Twitter reçue pour :", message.videoUrl);
        //console.log("message.videoUrl=",message.videoUrl);
        console.log("entrée dans téléchargemeent twitter");
        
        console.log("backgroundchrome.runtime=",chrome.runtime);
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/icon48.png', // doit être dans ton dossier d’extension
            title: 'Téléchargement terminé',
            message: 'La vidéo a été téléchargée avec succès.',
            priority: 1
        });

            /*
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: "downloadBlob", blob: blob });
                });         */
    }  

    // Indique à Chrome qu'on utilise sendResponse de manière asynchrone
    return true;
});
