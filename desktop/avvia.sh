#!/bin/sh
# Avvia DPSH sul PC Linux. Serve Electron: su Arch «sudo pacman -S electron».
cd "$(dirname "$0")"
if command -v electron >/dev/null 2>&1; then exec electron . "$@"; fi
for e in electron38 electron37 electron36 electron35 electron34; do
    if command -v "$e" >/dev/null 2>&1; then exec "$e" . "$@"; fi
done
echo "Manca Electron. Su Arch Linux: sudo pacman -S electron" >&2
exit 1
