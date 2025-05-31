
let lastClickedLink = null;
// À chaque clic droit sur la page
document.addEventListener("contextmenu", (event) => {
  const link = event.target.closest("a");
  if (link) {
    lastClickedLink = link;  // on garde une référence DOM
  } else {
    lastClickedLink = null;
  }

  console.log("link.getAttribute(href)=",link.getAttribute("href"));
  const videoUrl = "https://www.youtube.com" + link.getAttribute("href");
  console.log("videoUrl=",videoUrl);

  // Envoie la source vidéo au background
  chrome.runtime.sendMessage({ action: "sendVideoUrl", videoUrl: videoUrl });
  
});

/*
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getVideoUrl") {
    console.log("link=",link);
    console.log("content listener");
    // Récupère la source de la vidéo (la première vidéo sur la page)
    const videoUrl = "https://www.youtube.com" + link.getAttribute("href");

    console.log("videoUrl=",videoUrl);

    // Envoie la source vidéo au background
    chrome.runtime.sendMessage({ action: "sendVideoUrl", videoUrl: src });

    // Optionnel : si tu veux répondre directement ici (mais pas nécessaire si tu envoies un autre message)
    sendResponse({ videoUrl: src });
  }
});
*/


function injectDownloadButton() {
  console.log("Youtube");
  const video = document.querySelector('video');
  if (!window.location.hostname.includes('youtube.com')) return;
  
  console.log("La fonction Youtube est enclenchée"); 
  if (video && !document.getElementById('yt-idm-style-btn')) {
    const button = document.createElement('div');
    button.id = 'yt-idm-style-btn';
    button.title = 'Télécharger cette vidéo';
    button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" fill="white">
        <path d="M5 20h14v-2H5v2zm7-18L5.33 9h4.34v6h4.66V9h4.34L12 2z"/>
      </svg>
    `;
    
    // Style IDM-like
    Object.assign(button.style, {
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '80px',
      height: '36px',
      backgroundColor: '#0073e6',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      zIndex: '1000',
    });

    const container = video.parentElement;
    container.style.position = 'relative';
    container.appendChild(button);


    // Survol : apparition/disparition
    video.addEventListener('mouseenter', () => {
      button.style.opacity = '1';
      //if (!video.contains(e.relatedTarget)) {
      //  button.style.opacity = '0';  
    });
    
    video.addEventListener('mouseleave', (e) => {
      if (!button.contains(e.relatedTarget)) {
        button.style.opacity = '0';}
  });  
    
    /*
    videoElement.addEventListener("mouseleave", () => {
  setTimeout(() => {
    const btn = document.getElementById('yt-download-btn');
    if (btn && !btn.matches(':hover')) {
      btn.style.display = 'none';
    }
  }, 100);
});
    
    downloadButton.addEventListener("mouseleave", () => {
  setTimeout(() => {
    if (!videoElement.matches(':hover')) {
      downloadButton.style.display = 'none';
    }
  }, 100);
});
    */
    // Click → téléchargement
    button.addEventListener('click', () => {
      event.stopPropagation();
      event.preventDefault();
      const videoUrl = window.location.href;
      chrome.runtime.sendMessage({ action: 'downloadVideoYoutube', videoUrl });
    });
  }
}

function addDownloadButtonTo(video) {
  //console.log("fonction addDownloadButtonTo enclenchée");
  if (video.dataset.arbanHandled) return;
  
  //console.log("video=",video);
  video.dataset.arbanHandled = "true";
  
  const button = document.createElement('div');
  button.innerText = "Télécharger";  // Texte visible
  button.title = "Télécharger cette vidéo"; // Tooltip
  button.className = "download-button";
  button.style.position = "absolute";
  button.style.top = "10px";
  button.style.right = "10px";
  button.style.zIndex = "9999";
  button.style.backgroundColor = "#1DA1F2"; // Couleur Twitter bleue
  button.style.color = "white"; // Texte blanc
  button.style.padding = "5px 8px";
  button.style.border = "none";
  button.style.borderRadius = "4px";
  button.style.cursor = "pointer";
  button.style.fontSize = "12px";
  button.style.display = 'flex';

  const container = video.parentElement;
  container.style.position = 'relative';
  container.appendChild(button);
  
  /*
  video.addEventListener('mouseenter', () => button.style.display = 'flex');
  button.addEventListener('mouseenter', () => button.style.display = 'flex');
  video.addEventListener('mouseleave', () => {
    setTimeout(() => {
      if (!button.matches(':hover')) button.style.display = 'none';
    }, 200);
  });
  button.addEventListener('mouseleave', () => button.style.display = 'none');
  */

  button.addEventListener('click', async (event) => {
    // seul mon bouton réagit au clic, un clic ne mettra pas la vidéo en pause
    event.stopPropagation();
    event.preventDefault();
    
    const tweetElement = button.closest('article');

    // On cherche un lien vers le tweet dans ce bloc
    const tweetLink = tweetElement?.querySelector('a[href*="/status/"]');
    // Construire l'URL complète à partir de href
    const tweetUrl = tweetLink ? `https://twitter.com${tweetLink.getAttribute('href')}` : window.location.href;
    try {
        // Étape 1 : Sélection dossier
        const dirHandle = await window.showDirectoryPicker();

        // Étape 2 : Demander le nom du fichier
        const randomName = crypto.randomUUID(); //créer un nom aléatoire pour le fichier vidéo à télécharger 
        const fileName = prompt("Entrez le nom du fichier (avec extension)", `${randomName}.mp4`);
        //console.log("filename=",fileName);
        if (!fileName) return;

        // Étape 3 : Créer le fichier
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });

        // Appel au Back-end pour télécharger la vidéo
        const response = await fetch("http://localhost:5050/download_twitter_video", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: tweetUrl })
        })
        
        if (!response.ok) {
            console.error("Erreur lors du téléchargement :", response.statusText);
            return;
        }
        
        const blob = await response.blob();
        
        // Étape 5 : Écrire le fichier sur le disque
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        
        if (fileHandle) {
            chrome.runtime.sendMessage({ type: "download_complete_verified", success: true });
        }

        //Envoie au Background pour afficher message de fin
        chrome.runtime.sendMessage({ type: "download_complete" });
        }

       catch (err) {
        console.error("Erreur lors de la sélection du dossier ou du nom de fichier :", err);
    } 
  }
  );}

function detectTwitterVideos() {
  if (!window.location.hostname.includes('x.com')) return;
  const twitterVideos = document.querySelectorAll('video');
  twitterVideos.forEach(video => {
    if (!video.parentElement.querySelector('.download-button')) {
      addDownloadButtonTo(video);  // ✅ Ajouter seulement si pas déjà présent
    }
  });
}



// Lancer la détection toutes les 2 secondes
setInterval(detectTwitterVideos, 4000);

setTimeout(injectDownloadButton, 3000);



function injectDownloadButton_short() {
  console.log("injectDownloadButton_short");
  if (!window.location.pathname.startsWith('/shorts/')) return;
  console.log("11111");
  const video = document.querySelector('video');
  if (!video) return;

  if (document.getElementById('yt-idm-style-btn-short')) return;

  const button = document.createElement('div');
  button.id = 'yt-idm-style-btn-short';
  button.title = 'Télécharger ce Short';
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" fill="white">
      <path d="M5 20h14v-2H5v2zm7-18L5.33 9h4.34v6h4.66V9h4.34L12 2z"/>
    </svg>
  `;

  console.log("222222");
  Object.assign(button.style, {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '80px',
    height: '36px',
    backgroundColor: '#0073e6',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    zIndex: '1000',
  });

  const container = video.parentElement;
  container.style.position = 'relative';
  container.appendChild(button);

  video.addEventListener('mouseenter', () => { button.style.opacity = '1'; });
  video.addEventListener('mouseleave', (e) => {
    if (!button.contains(e.relatedTarget)) button.style.opacity = '0';
  });
  console.log("33333");
  button.addEventListener('mouseenter', () => { button.style.opacity = '1'; });
  button.addEventListener('mouseleave', (e) => {
    if (!video.contains(e.relatedTarget)) button.style.opacity = '0';
  });

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    const videoUrl = window.location.href;
    chrome.runtime.sendMessage({ action: 'downloadVideoYoutube', videoUrl });
  });
}


setTimeout(injectDownloadButton_short, 3000);


