#!/bin/sh
# Mette DPSH nel menu delle applicazioni (solo per questo utente). Da rilanciare se si sposta la cartella.
cd "$(dirname "$0")" && QUI="$(pwd)"
chmod +x "$QUI/avvia.sh"
mkdir -p "$HOME/.local/share/applications"
cat > "$HOME/.local/share/applications/dpsh.desktop" <<FINE
[Desktop Entry]
Type=Application
Name=DPSH
Comment=Prove penetrometriche dinamiche
Exec="$QUI/avvia.sh"
Icon=$QUI/icona.png
Terminal=false
Categories=Science;Engineering;
FINE
echo "Fatto: DPSH è nel menu delle applicazioni."
