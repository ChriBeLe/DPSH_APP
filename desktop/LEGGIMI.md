# DPSH sul PC (Linux, Arch compreso)

La stessa app di `DPSH.html`, in una finestra sua invece che in una scheda del browser.
Dentro c'è Chromium (Electron): l'app si vede e stampa esattamente come in Chrome.

## Installare su Arch Linux (una volta sola)

1. Electron, dai pacchetti ufficiali:

       sudo pacman -S electron

2. Scompatta `DPSH-pc.zip` dove vuoi tenerlo (per esempio in `~/Programmi/DPSH`).
3. Per averlo nel menu delle applicazioni, dalla cartella scompattata:

       ./installa.sh

Poi DPSH si apre dal menu, come gli altri programmi. In alternativa: `./avvia.sh`.

## Cosa cambia rispetto al browser

- **PDF**: «Genera PDF» chiede dove salvare e scrive il file, senza il pannello di stampa.
- **Word, Excel, backup**: chiedono dove salvare, partendo da Scaricati.
- **Link a internet** (mappe, Google Maps): si aprono nel browser di sempre.
- **Tasti**: F11 schermo intero, Ctrl + / Ctrl − ingrandiscono, Ctrl 0 torna al 100%.

## I progetti che hai già nel browser

Il programma ha un archivio suo: i progetti del browser non ci sono da soli.
Per portarli: nel browser, dalla Home, fai un **backup completo**; nel programma, **Ricevi**
e scegli quel file. Da lì in poi lavora in uno solo dei due.

## Aggiornare

Sostituisci `DPSH.html` nella cartella con quello nuovo (o scompatta il pacchetto nuovo sopra
il vecchio). I progetti restano: stanno nell'archivio del programma, non nella cartella.

## Per chi sviluppa

Dentro il progetto, `desktop/` usa `../dist/DPSH.html`: `python build.py` e poi
`electron desktop` (o `./desktop/avvia.sh`). `python desktop/pacchetto.py` prepara
`dist/DPSH-pc.zip` con DPSH.html dentro.
