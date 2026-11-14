# Loop
Android WebView app. v3.x: вводите только адрес сайта; приложение запоминает первый ручной проход (ссылка -> кнопки) и повторяет после таймера N раз. Диагностика (Снимок, Лог, Сохранить) под кнопкой ⚙.
Build: push to main -> GitHub Actions -> Loop.apk in Releases.

## Update from Termux (one block, with progress; change only V)
V=3.0; cd ~/loop && echo "▶ 1/5 Распаковка архива..." && rm -f app/src/main/assets/script.js && unzip -oq ~/storage/downloads/Loop-v$V.zip && echo "▶ 2/5 Коммит..." && { git add -A && git commit -qm "v$V" || true; } && echo "▶ 3/5 Отправка на GitHub..." && git pull --no-rebase -X ours --no-edit -q && git push -q && echo "▶ 4/5 Сборка APK на GitHub (идёт онлайн)..." && sleep 10 && gh run watch "$(gh run list --commit "$(git rev-parse HEAD)" --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status && echo "▶ 5/5 Скачиваю APK..." && gh release download --pattern Loop.apk --dir ~/storage/downloads --clobber && echo "✔ Готово: Загрузки/Loop.apk, можно устанавливать"
