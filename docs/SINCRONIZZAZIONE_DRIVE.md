# Login Google, chiavi cifrate e sincronizzazione su Drive

Solo nella versione web (https://dpsh.netlify.app o localhost). In APK ed Electron il tasto è spento ("Il login funziona dalla versione web o installata dal browser"). L'app resta offline-first: senza rete o senza account funziona tutta; la sincronizzazione parte quando c'è rete.

## Come funziona

- **Login (077)**: Google Identity Services, `initTokenClient`, nessun client secret. Lo script `accounts.google.com/gsi/client` si carica solo al tocco su "Accedi con Google" (e, a chi era già collegato, all'avvio per rinnovare il permesso in silenzio). Il token sta solo in memoria; in localStorage resta il segno `dpsh_google_collegato` (email, nome). Scope: `drive.appdata` e `drive.file`.
- **Chiavi API (078)**: file `dpsh-chiavi.json` in `appDataFolder` (cartella nascosta): `{ v:1, kdf:'PBKDF2-SHA256', iter:600000, salt, iv, ct }` in base64; AES-GCM 256, sale 16 byte, iv 12 byte nuovo a ogni scrittura. La frase la scrive l'utente (campo password), non si salva; la CryptoKey non estraibile resta in memoria per la sessione e, finché c'è, le modifiche alle chiavi ricaricano il file. Frase persa = chiavi da reinserire. Le chiavi non entrano in log, URL, esportazioni, pacchetti, stato di sincronizzazione né messaggi all'IA.
- **Progetti (079)**: cartella visibile "DPSH", un file per progetto `<nome> - <id>.zip` nel formato del pacchetto di progetto (044b), con `appProperties` `dpshId` e `impronta`. Per progetto si ricorda (localStorage `dpsh_sync_drive`): impronta all'ultima sincronizzazione, id del file, modifiedTime remoto. Registro delle ultime 20 voci nella sezione "Account Google".

## Regole

| Situazione | Azione |
|---|---|
| cambiato solo qui | carica |
| cambiato solo su Drive | copia automatica locale (048), poi sostituisce |
| cambiato in entrambi | tiene entrambi: il locale resta, quello di Drive entra come "(da Drive, data)" |
| nuovo su Drive | scarica |
| eliminato qui / sparito da Drive | non si propaga: anteprima, decide l'utente (su Drive solo cestino, mai delete) |
| elenco di Drive vuoto o incompleto | mai "tutto eliminato"; un errore su una pagina ferma tutto |

Automatica (evento `online`, avvio se collegato, ogni 10 minuti): solo carica, scarica nuovi, sostituisce con copia. Conflitti ed eliminazioni aspettano ("Conflitto: N", "Da decidere: N"). Anteprima con Conferma/Annulla alla prima sincronizzazione e quando ci sono conflitti o eliminazioni.

## Passi su Google Cloud (progetto del Client ID `43317256953-...`)

1. API e servizi, Libreria: attivare **Google Drive API**.
2. Schermata di consenso OAuth: aggiungere gli scope `.../auth/drive.appdata` e `.../auth/drive.file`.
3. Credenziali, ID client OAuth (applicazione web): in **Origini JavaScript autorizzate** mettere `https://dpsh.netlify.app` e gli indirizzi delle anteprime Netlify (`https://<deploy>--dpsh.netlify.app`), più `http://localhost:<porta>` per provare. Nessun URI di reindirizzamento.
4. Se l'app è in "Test", aggiungere gli utenti di prova; per tutti gli altri serve la pubblicazione della schermata di consenso.

## Limiti noti

- Il rinnovo silenzioso del token (`prompt: ''`) può richiedere un tocco: in quel caso lo stato dice "Tocca Sincronizza ora" e l'automatica si ferma finché non si tocca.
- Sincronizzare i progetti ricalcola l'impronta (foto comprese); l'automatica riusa il risultato finché `modificatoIl` non cambia.
- Il codice è provato solo con Google e Drive finti (test/google_*.js), non contro i server veri.
