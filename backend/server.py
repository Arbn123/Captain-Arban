
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pytubefix import YouTube
from pytubefix.cli import on_progress
import os, io, uuid, yt_dlp, tempfile, time, threading


app = Flask(__name__)
CORS(app)

@app.route("/test", methods=["GET"])
def test():
    return "CORS OK"

@app.route('/download_youtube', methods=['POST'])
def download_video():
    data = request.get_json()
    url = data.get('url')

    if not url:
        return jsonify({'error': 'No URL provided'}), 400
    try:
        if "twitter.com" in url or "x.com" in url:
            output_path = os.path.expanduser("~/Downloads")
            command = [
                "yt-dlp",
                "-o", os.path.join(output_path, "%(title)s.%(ext)s"),
                url
            ]
            subprocess.run(command, check=True)
            return jsonify({'status': 'success', 'title': 'Twitter video'})
        else:
            yt = YouTube(url, on_progress_callback=on_progress)
            print(f"Téléchargement de : {yt.title}")
            ys = yt.streams.get_highest_resolution()
            ys.download(output_path=os.path.expanduser("~\Downloads"))
            return jsonify({'status': 'success', 'title': yt.title})
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/download_twitter_video', methods=['POST'])
def download_twitter_video():
    data = request.json
    print("data=",data)
    twitter_url = data.get('url')
    print(twitter_url)
    chemin_cookie=r"C:\Users\arban\arban-ext\backend\x.com_cookies.txt"

    #if not twitter_url or "twitter.com" not in twitter_url or "x.com" not in twitter_url:
    if not twitter_url or not any(domain in twitter_url for domain in ["twitter.com", "x.com"]):
        return jsonify({"error": "Invalid Twitter URL"}), 400
    try:
        # Créer un nom de fichier temporaire unique
        save_path = r"C:\Users\arban\Videos"
        os.makedirs(save_path, exist_ok=True)  # Crée le dossier s'il n'existe pas

        filename = os.path.join(save_path, f"{uuid.uuid4()}.mp4")
        print(filename)

        http_headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'}
        #filename = f"/tmp/{uuid.uuid4()}.mp4"
        ydl_opts = {
            'outtmpl': filename,
            'quiet': True,
            'format': 'best[ext=mp4]/best',
            'cookiefile': chemin_cookie,
            'http_headers': http_headers
        }

        print("1111")
        # with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        #     ydl.download([twitter_url])
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(twitter_url, download=True)
        print(filename)

        # with open(filename, "rb") as f:
        #     video_binary = f.read()
        # @after_this_request
        # def remove_file(response):
        #     print("fonction remove_file engagée")
        #     try:
        #         os.remove(filename)
        #     except Exception as e:
        #         print("Erreur lors de la suppression :", e)
        #     return response
        threading.Thread(target=delayed_delete, args=(filename,)).start()
        return send_file(filename, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Nettoyage optionnel si besoin
        pass


def delayed_delete(path):
    time.sleep(5)  # Attendre que le client ait reçu le fichier
    try:
        os.remove(path)
    except Exception as e:
        print(f"Erreur suppression fichier {path} : {e}")


#
# @app.route('/download_twitter_video', methods=['POST'])
# def download_twitter_video():
#     data = request.json
#     print("data=",data)
#     twitter_url = data.get('url')
#     print(twitter_url)
#     chemin_cookie=r"C:\Users\arban\arban-ext\backend\x.com_cookies.txt"
#
#     #if not twitter_url or "twitter.com" not in twitter_url or "x.com" not in twitter_url:
#     if not twitter_url or not any(domain in twitter_url for domain in ["twitter.com", "x.com"]):
#         return jsonify({"error": "Invalid Twitter URL"}), 400
#     try:
#         # Créer un nom de fichier temporaire unique
#         save_path = r"C:\Users\arban"
#         os.makedirs(save_path, exist_ok=True)  # Crée le dossier s'il n'existe pas
#
#         filename = os.path.join(save_path, f"{uuid.uuid4()}.mp4")
#         print(filename)
#
#         http_headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'}
#         #filename = f"/tmp/{uuid.uuid4()}.mp4"
#
#         with tempfile.NamedTemporaryFile(suffix=".mp4", delete=True) as tmpfile:
#             ydl_opts = {
#                 'outtmpl': tmpfile.name,
#                 'quiet': True,
#                 'format': 'best[ext=mp4]/best',
#                 'cookiefile': chemin_cookie,
#                 'http_headers': http_headers
#             }
#
#             print("1111")
#             with yt_dlp.YoutubeDL(ydl_opts) as ydl:
#                 ydl.download([twitter_url])
#             # with yt_dlp.YoutubeDL(ydl_opts) as ydl:
#             #     info = ydl.extract_info(twitter_url, download=True)
#             tmpfile.flush()
#             # with open(filename, "rb") as f:
#             #     video_binary = f.read()
#             return send_file(filename, as_attachment=True)
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500
#     finally:
#         # Nettoyage optionnel si besoin
#         pass


if __name__ == '__main__':
    #app.run(port=5050)
    #app.run(host='0.0.0.0', port=5000)
    #import sys; sys.argv = ['server.py']
    #app.run(host='127.0.0.1', port=3000, debug=True)
    app.run(host='127.0.0.1', port=5050, debug=False, use_reloader=False)






