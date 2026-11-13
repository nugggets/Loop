# Loop
Android WebView app: opens a site, enters your link into the field, waits for the timer to finish, repeats N times.
Build: push to main -> GitHub Actions -> APK in Releases.

## Update from Termux (one block)
cd ~/linkrepeater && unzip -o ~/storage/downloads/Loop-vX.Y.zip && git add -A && git commit -m "vX.Y" && git pull --no-rebase -X ours --no-edit && git push
