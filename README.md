# Loop
Android WebView app. v2.x = диагностика сайта: снимок структуры страницы + запись сети, кликов и таймера.
Build: push to main -> GitHub Actions -> Loop.apk in Releases.

## Update from Termux (one block)
cd ~/loop && rm -f app/src/main/assets/script.js && unzip -o ~/storage/downloads/Loop-vX.Y.zip && git add -A && git commit -m "vX.Y" && git pull --no-rebase -X ours --no-edit && git push
