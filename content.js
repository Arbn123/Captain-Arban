
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
    });
    
    video.addEventListener('mouseleave', () => {
      button.style.opacity = '0';
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
      //event.stopPropagation();
      //event.preventDefault();
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

  button.addEventListener('click', (event) => {
    // seul mon bouton réagit au clic, un clic ne mettra pas la vidéo en pause
    event.stopPropagation();
    event.preventDefault();
    
    const tweetElement = button.closest('article');

    // On cherche un lien vers le tweet dans ce bloc
    const tweetLink = tweetElement?.querySelector('a[href*="/status/"]');
    // Construire l'URL complète à partir de href
    const tweetUrl = tweetLink ? `https://twitter.com${tweetLink.getAttribute('href')}` : window.location.href;

    // 👉 Déclenche immédiatement une fenêtre de téléchargement avec un fichier vide
    const dummyBlob = new Blob([], { type: 'video/mp4' });
    const dummyUrl = URL.createObjectURL(dummyBlob);
    const filename = `${crypto.randomUUID()}.mp4`;

    const a = document.createElement("a");
    a.href = dummyUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(dummyUrl);

    // Envoi vers background.js
    chrome.runtime.sendMessage({ action: 'downloadVideotwitter', videoUrl: tweetUrl, filename });
    console.log("tweetUrl=",tweetUrl);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log("on passe à content.js");
      if (message.action === "downloadBase64") {
        fetch(message.base64)
          .then(res => res.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const randomName = crypto.randomUUID(); 
            a.download = `${randomName}.mp4`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          });
      }
      });

}

function detectTwitterVideos() {
  //console.log("1111111");
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

