# start_flask.py
import subprocess
import os
import time

def start_flask():
    # Remplacer le chemin par le fichier où se trouve ton serveur Flask
    flask_app = os.path.join(os.getcwd(), "server.py")  # Ou "server.py"
    process = subprocess.Popen(["python", flask_app], stdout=subprocess.PIPE, stderr=subprocess.PIPE)

    # Attendre un peu pour que Flask soit bien démarré
    time.sleep(5)

    return process

if __name__ == "__main__":
    print("Démarrage du serveur Flask...")
    process = start_flask()
    print("Serveur Flask démarré.")

    # Le programme restera actif jusqu'à ce qu'on l'arrête manuellement
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("Arrêt du serveur Flask.")
        process.terminate()  # Fermer le serveur Flask proprement

