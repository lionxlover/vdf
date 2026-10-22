# VDF Viewer — web app (all devices)

One app for Windows, macOS, Linux, ChromeOS, Android, iPhone and iPad. It is a static
site: host the folder over HTTPS (or run it locally), open it, and install it.
Documents are parsed on your device — nothing is uploaded, and it works offline after first load.

## Run it
- **Locally:** `python3 -m http.server 8080` in this folder, then open http://localhost:8080
- **Hosted:** upload the folder to any HTTPS static host (GitHub Pages, Netlify, Cloudflare Pages…)

## Install it
| Device | How |
|---|---|
| Windows / macOS / Linux / ChromeOS (Chrome, Edge, Brave) | Install icon in the address bar, or menu → Install VDF Viewer |
| Android (Chrome) | Menu → Install app / Add to Home screen |
| iPhone / iPad (Safari) | Share → Add to Home Screen |

On desktop Chrome/Edge, installing also registers the app for `.vdf` files, so you can double-click a
document to open it. On iOS, open the app and choose a file.
