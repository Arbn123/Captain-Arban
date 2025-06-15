
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

// Fonction d'attente asynchrone (ici 3 secondes)
function waitFor(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Fonction qui injecte le bouton "télécharger" sur la vidéo Youtube en lecture
function injectDownloadButton() {
  console.log("Youtube");
  const video = document.querySelector('video');
  if (!location.href.includes('youtube.com/watch')) return;
  
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
function addDownloadButtonToX(video) {

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
  //console.log("container=",container);
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
    event.stopPropagation();
    event.preventDefault();

    //Ouvrir le picker pour enregistrer la vidéo
    const randomName = crypto.randomUUID(); // nom aléatoire
    console.log("randomName=",randomName);
    const fileHandle = await window.showSaveFilePicker({
        suggestedName: `${randomName}.mp4`,
        types: [{
            description: 'MP4 Video',
            accept: { 'video/mp4': ['.mp4'] },
        }]
    });

    console.log("fileHandle=",fileHandle);

    const tweetElement = button.closest('article');
    const tweetLink = tweetElement?.querySelector('a[href*="/status/"]');
    const tweetUrl = tweetLink ? `https://twitter.com${tweetLink.getAttribute('href')}` : window.location.href;
    
    try {
        // Étape 1 : Récupération du contenu vidéo via le backend
        const response = await fetch("http://localhost:5050/download_twitter_video", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: tweetUrl })
        });
        console.log("response=",response);
        if (!response.ok) {
            console.error("Erreur lors du téléchargement :", response.statusText);
            return;
        }
        
        const blob = await response.blob();
        console.log("blob=",blob);

        // Étape 3 : Écrire le fichier sur le disque
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        chrome.runtime.sendMessage({ type: "download_complete_verified", success: true });
        chrome.runtime.sendMessage({ type: "download_complete" });

    } catch (err) {

        chrome.runtime.sendMessage({ type: "serveur_eteint", success: true });
        console.error("Erreur lors du téléchargement ou de l’enregistrement :", err);
    }
  });
  }

//Parcourt le fil X pour injecter le bouton sur chaque vidéo
function detectTwitterVideos() {
  if (!window.location.hostname.includes('x.com')) return;
  const twitterVideos = document.querySelectorAll('video');
  twitterVideos.forEach(video => {
    if (!video.parentElement.querySelector('.download-button')) {
      addDownloadButtonToX(video);  // ✅ Ajouter seulement si pas déjà présent
    }
  });
}

// Lancer la détection toutes les 4 secondes
setInterval(detectTwitterVideos, 10000);


function injectDownloadButton_short_youtube() {
  
  if (!location.href.includes('youtube.com/shorts')) return;
  console.log("Shorts Youtube");
  const video = document.querySelector('video');
  console.log("video=",video);
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

  console.log("button=",button);
  
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

setTimeout(injectDownloadButton_short_youtube, 4000);

function injectButtonReelsFacebook11() {
  if (!location.href.includes("facebook.com/reel")) return;

  const reelDivs = document.querySelectorAll('.x1cy8zhl.x9f619.x78zum5.x1q0g3np.xl56j7k.x6ikm8r.x10wlt62.xsag5q8.xz9dl7a');
  console.log("reelDivs=",reelDivs);
  
  for (let i = 0; i < reelDivs.length; i++) {
  const reelDiv = reelDivs[i];           //div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x1icxu4v.x25sj25
  console.log("reelDiv=",reelDiv);      //'div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.xsyo7zv.x16hj40l'
  console.log(reelDivs[i].querySelector('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x1icxu4v.x25sj25'));
                                                        //x1ey2m1c x9f619 xds687c x17qophe x10l6tqk x13vifvy x1ypdohk
  const targetDiv = reelDivs[i].querySelector('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x1icxu4v.x25sj25');
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
      
      //Ouvrir le picker pour enregistrer la vidéo
      const randomName = crypto.randomUUID(); // nom aléatoire
      console.log("randomName=",randomName);
      const fileHandle = await window.showSaveFilePicker({
          suggestedName: `${randomName}.mp4`,
          types: [{
              description: 'MP4 Video',
              accept: { 'video/mp4': ['.mp4'] },
          }]
      });

      const reelUrl = location.href;
      
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


function injectButtonReelsFacebook() {
  if (!location.href.includes("facebook.com/reel")) return;

  //console.log("reelDiv=",reelDiv);      //'div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.xsyo7zv.x16hj40l'
  //console.log(reelDivs[i].querySelector('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x1icxu4v.x25sj25'));
                                            //x1ey2m1c x9f619 xds687c x17qophe x10l6tqk x13vifvy x1ypdohk
  const targetDiv = document.querySelectorAll('div.x9f619.x1n2onr6.x1ja2u2z.x78zum5.xdt5ytf.x193iq5w.xeuugli.x1r8uery.x1iyjqo2.xs83m0k.x1icxu4v.x25sj25');
  //console.log("targetDiv=",targetDiv);

  //if (!targetDiv || targetDiv.querySelector('.arban-download-btn')) continue;

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

  targetDiv[0].style.position = 'relative';
  targetDiv[0].appendChild(button);

  button.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    //Ouvrir le picker pour enregistrer la vidéo
    const randomName = crypto.randomUUID(); // nom aléatoire
    //console.log("randomName=",randomName);
    const fileHandle = await window.showSaveFilePicker({
        suggestedName: `${randomName}.mp4`,
        types: [{
            description: 'MP4 Video',
            accept: { 'video/mp4': ['.mp4'] },
        }]
    });

    const reelUrl = location.href;
    console.log("reelUrl=",reelUrl);
    let response;
    try{
      const response = await fetch("http://localhost:5050/download_facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: reelUrl })
      });
      console.log("response=",response);
      
      if (!response.ok) {
        console.error("Erreur lors du téléchargement :", response.statusText);
        return;
      }
      
      const blob = await response.blob();
      console.log("blob=",blob);
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
    }

    catch (error) {
      alert("Erreur : le serveur n'est pas disponible.\nAssurez-vous que le back-end est lancé.");
    }

    chrome.runtime.sendMessage({ type: "download_complete" });
  
  }); //}
}

setTimeout(injectButtonReelsFacebook, 3000);

if (location.href.includes("facebook.com/reel")) {
  
  const observer = new MutationObserver(() => {
    console.log("observer mutation");
    observer.disconnect(); // Empêche une boucle infinie
    const button = document.querySelector('.arban-download-btn');
    if (button) {
      button.remove();
    }
    //console.log("Injection du bouton");
    injectButtonReelsFacebook();
    //console.log("fin fonction injectButtonReelsFacebook");
    // Réactiver l'observation après les modifications DOM
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  });

  //console.log("reprise de l'observer initial");
  // Lancer l'observation initiale
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}



function injectButton_Tiktok_Accueil() {
  console.log("tiktok");
  if (!location.href.includes("tiktok.com/")) return;

  const reelDivs = document.querySelectorAll('.x1cy8zhl.x9f619.x78zum5.x1q0g3np.xl56j7k.x6ikm8r.x10wlt62.xsag5q8.xz9dl7a');
  const articles= Array.from(document.querySelectorAll('article'))
        .filter(article => article.querySelector('*'));
  const videos= document.querySelectorAll('video');
  
  console.log("videos=",videos);
  
  for (let i = 0; i < articles.length; i++) {
    console.log("articles.length=",articles.length);
    const article = articles[i];
    
     // Injection uniquement si article a des enfants (n'est pas une feuille)
    if (article.children.length === 0) {
      console.log("Skip article leaf", article);
      continue; // passe au suivant
    }
  
    const button = document.createElement('button');
    button.innerText = '⬇ Télécharger';
    button.className = 'arban-download-btn';
    
    Object.assign(button.style, {
      position: 'absolute',
      top: '5px',
      left: '50px',
      zIndex: '9999',
      padding: '8px 12px',
      background: '#1877f2',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    });

    const targetDiv = article.querySelector('div.css-10mp6n3-DivMediaControlsTop.e1yeguby2');
    console.log("targetDiv=",targetDiv);
    console.log("button=",button);
    targetDiv.style.position = 'relative';
    console.log("article=",article);   
    targetDiv.appendChild(button);
    

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      const a=article.querySelector('a[class*="AuthorAnchor"]');
      
      const url_author=a.href;
      const video=article.querySelector('video').parentElement;

      const video_id=video.id
      const lastPart = video_id.split('-').pop();

      console.log("a=",a);
      console.log("lastPart=",lastPart);
      tik_url=a+"/video/"+lastPart;
      console.log("tik_url=",tik_url);
      
      //Ouvrir le picker pour enregistrer la vidéo
      const randomName = crypto.randomUUID(); // nom aléatoire
      console.log("randomName=",randomName);
      const fileHandle = await window.showSaveFilePicker({
          suggestedName: `${randomName}.mp4`,
          types: [{
              description: 'MP4 Video',
              accept: { 'video/mp4': ['.mp4'] },
          }]
      });
      
      const response = await fetch("http://localhost:5050/download_tiktok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: tik_url })
      });

      const blob = await response.blob();
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
  }); }
}    


function injectButton_Tiktok_profil(){
  console.log("tiktok@@@")
  if (!location.href.includes("tiktok.com/@")) return;
  
  const conteneur_videos = document.querySelector('div[data-e2e="user-post-item-list"]');
  //console.log("conteneur_videos=",conteneur_videos);
  
  //const les_articles=conteneur_videos.querySelectorAll('a');
  //console.log("les_articles=",les_articles);
  //conteneur_videos.forEach((a)=>a.); 
  
  const aa=document.querySelector('div.css-1vve6pb-DivSearchBarBackground.e11s2kul25')
  //console.log("aa=",aa);
  
  const isVideoUrl = /^\/@[^/]+\/video\/[^/]+/.test(location.pathname);

  const button = document.createElement('button');
    button.innerText = '⬇ Télécharger';
    button.className = 'arban-download-btn';
    
    Object.assign(button.style, {
      position: 'absolute',
      top: '5px',
      left: '50px',
      zIndex: '9999',
      padding: '8px 12px',
      background: '#1877f2',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
    });

  if (isVideoUrl){
    //console.log("1111111");
    const cadre_video=document.querySelectorAll('div[class*="DivVideoContainer"]');
    //console.log("cadre_video=",cadre_video[0]);
    
    id_div=cadre_video[0].querySelector('div[id*="xgwrapper-"]')
    //console.log("id_div=",id_div);
    
    id_video=id_div.id.split('-').pop();

    video=cadre_video[0].querySelector('div[class="css-sq145r"]');
    //console.log("video=",video);
    //console.log("button=",button);
    video.appendChild(button);
  }

  button.addEventListener('click', async (event) => {
    event.stopPropagation();
    event.preventDefault();

    //Ouvrir le picker pour enregistrer la vidéo
    const randomName = crypto.randomUUID(); // nom aléatoire
    console.log("randomName=",randomName);
    const fileHandle = await window.showSaveFilePicker({
        suggestedName: `${randomName}.mp4`,
        types: [{
            description: 'MP4 Video',
            accept: { 'video/mp4': ['.mp4'] },
        }]
    });

    //console.log("fileHandle=",fileHandle);
    //console.log("id_video=",id_video);
    //console.log("location.href=",location.href);

    try {
        // Étape 1 : Récupération du contenu vidéo via le backend
        const response = await fetch("http://localhost:5050/download_tiktok", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ url: location.href })
        });

        //console.log("response=",response);
        if (!response.ok) {
            console.error("Erreur lors du téléchargement :", response.statusText);
            return;
        }

        const blob = await response.blob();
        //console.log("blob=",blob);

        // Étape 3 : Écrire le fichier sur le disque
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        chrome.runtime.sendMessage({ type: "download_complete_verified", success: true });
        chrome.runtime.sendMessage({ type: "download_complete" });

    } catch (err) {
        chrome.runtime.sendMessage({ type: "serveur_eteint", success: true });
        console.error("Erreur lors du téléchargement ou de l’enregistrement :", err);
    }
  });

}


//setInterval(injectButton_Tiktok_Accueil, 10000);

if (location.href=="'https://www.tiktok.com/'"){
    injectButton_Tiktok_Accueil()

}
else if (location.href.includes("tiktok.com/@")) {
    setInterval(injectButton_Tiktok_profil,3000)
}

/*

if (location.href.includes("tiktok.com")) {
  //const targetNode = document.getElementById("column-list-container");
  //console.log("targetNode=",targetNode);
  //if (targetNode) {
    console.log("observer ciblé sur #column-list-container");
    const observer = new MutationObserver(() => {
      console.log("Mutation détectée dans #column-list-container");
      observer.disconnect(); // Stop temporaire pour éviter boucle infinie
      
      // Supprime tous les boutons existants pour éviter les doublons
      document.querySelectorAll('.arban-download-btn').forEach(btn => btn.remove());

      injectButton_Video_Tiktok();

      // Réactive l’observation
      observer.observe(document.body, {childList: true, subtree: true});
    });
    observer.observe(document.body, {childList: true, subtree: true});
  //} 
  //else {
  //  console.warn("Élément #column-list-container introuvable.");
  //}
}
*/


