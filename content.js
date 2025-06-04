
//Cette partie s'occupe du téléchargement avec clic-droit
let lastClickedLink = null;
// À chaque clic droit sur une icone de videos
document.addEventListener("contextmenu", (event) => {
  const link = event.target.closest("a");
  if (link) {
    lastClickedLink = link;  // on capture l element html contenant le lien de la video
                                    // en forme /watch?v=....
  } else {
    lastClickedLink = null;
  }
  
  //Contruire le lien complet de la vidéo sur laquelle on a cliqué
  const videoUrl = "https://www.youtube.com" + link.getAttribute("href");
  
  // Envoie la source vidéo au background
  chrome.runtime.sendMessage({ action: "sendVideoUrl", videoUrl: videoUrl });
});


// Fonction qui injecte le bouton "télécharger" sur la vidéo Youtube en lecture
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
setTimeout(injectDownloadButton, 3000);

//Injecte le bouton télécharger à une vidéo X donnée
function addDownloadButtonTo(video) {

  if (video.dataset.arbanHandled) return;
  
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

//Parcourt le fil X pour injecter le bouton sur chaque vidéo
function detectTwitterVideos() {
  if (!window.location.hostname.includes('x.com')) return;
  const twitterVideos = document.querySelectorAll('video');
  twitterVideos.forEach(video => {
    if (!video.parentElement.querySelector('.download-button')) {
      addDownloadButtonTo(video);  // ✅ Ajouter seulement si pas déjà présent
    }
  });
}

// Lancer la détection toutes les 4 secondes
setInterval(detectTwitterVideos, 4000);


function injectDownloadButton_short() {

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


function injectButtonReelsFacebook() {
  if (!window.location.hostname.includes('facebook')) return;

  const reelDivs = document.querySelectorAll('.x1cy8zhl.x9f619.x78zum5.x1q0g3np.xl56j7k.x6ikm8r.x10wlt62.xsag5q8.xz9dl7a');
  //console.log("reelDivs=",reelDivs);
  
  for (let i = 0; i < reelDivs.length; i++) {
  const reelDiv = reelDivs[i];
  //console.log("reelDiv=",reelDiv);
  //console.log(reelDivs[i].querySelector('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.xsyo7zv.x16hj40l'));
                                                        //x1ey2m1c x9f619 xds687c x17qophe x10l6tqk x13vifvy x1ypdohk
  const targetDiv = reelDivs[i].querySelector('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.xsyo7zv.x16hj40l');
  //console.log("targetDiv=",targetDiv);

  if (!targetDiv || targetDiv.querySelector('.arban-download-btn')) continue;

  const button = document.createElement('button');
  button.innerText = '⬇ Télécharger';
  button.className = 'arban-download-btn';

  Object.assign(button.style, {
    position: 'absolute',
    top: '0px',
    left: '10px',
    zIndex: '9999',
    padding: '8px 12px',
    background: '#1877f2',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  });

  targetDiv.style.position = 'relative';
  targetDiv.appendChild(button);
  //console.log("targetDiv apres bouton=",targetDiv); 

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const reelUrl = location.href;
      const dirHandle = await window.showDirectoryPicker();
      const randomName = crypto.randomUUID();
      const fileName = prompt("Nom du fichier (avec extension)", `${randomName}.mp4`);
      if (!fileName) return;

      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });

      const response = await fetch("http://localhost:5050/download_facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reelUrl })
      });

      const blob = await response.blob();
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    }); }
}


setTimeout(injectButtonReelsFacebook, 2000);


if (window.location.hostname.includes('facebook')) {
  //console.log("observer mutation");
  const observer = new MutationObserver(() => {
    observer.disconnect(); // Empêche une boucle infinie
    const button = document.querySelector('.arban-download-btn');
    if (button) {
      button.remove();
    }
    
    console.log("Injection du bouton");
    
    injectButtonReelsFacebook();
    console.log("fin fonction injectButtonReelsFacebook");

    // Réactiver l'observation après les modifications DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });

  console.log("reprise de l'observer initial");
  
  // Lancer l'observation initiale
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
}

