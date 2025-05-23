

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from pytubefix import YouTube
from pytubefix.cli import on_progress
import os, io, uuid

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

    #if not twitter_url or "twitter.com" not in twitter_url or "x.com" not in twitter_url:
    if not twitter_url or not any(domain in twitter_url for domain in ["twitter.com", "x.com"]):
        return jsonify({"error": "Invalid Twitter URL"}), 400
    try:
        # Créer un nom de fichier temporaire unique
        save_path = r"C:\Users\arban"
        os.makedirs(save_path, exist_ok=True)  # Crée le dossier s'il n'existe pas

        filename = os.path.join(save_path, f"{uuid.uuid4()}.mp4")
        print(filename)
        #filename = f"/tmp/{uuid.uuid4()}.mp4"
        ydl_opts = {
            'outtmpl': filename,
            'quiet': True,
            'format': 'best[ext=mp4]/best',
        }

        print("1111")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([twitter_url])
        print(filename)

        # with open(filename, "rb") as f:
        #     video_binary = f.read()
        return send_file(filename, as_attachment=True)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        # Nettoyage optionnel si besoin
        pass



if __name__ == '__main__':
    #app.run(port=5050)
    #app.run(host='0.0.0.0', port=5000)
    #import sys; sys.argv = ['server.py']
    #app.run(host='127.0.0.1', port=3000, debug=True)
    app.run(host='127.0.0.1', port=5050, debug=False, use_reloader=False)






