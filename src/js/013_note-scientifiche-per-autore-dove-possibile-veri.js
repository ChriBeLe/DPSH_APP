            // =========================================================================
            // NOTE SCIENTIFICHE PER AUTORE — dove possibile verificate (letteratura /
            // manualistica geotecnica reale), altrimenti segnalate onestamente come
            // descrizione generale del metodo.
            // =========================================================================
            const NOTE_SCIENTIFICHE = {
                'Terzaghi-Peck (1948)': {v:true, testo:"Karl Terzaghi e Ralph Peck, in «Soil Mechanics in Engineering Practice» (1948), pubblicarono le prime tabelle empiriche che collegano Nspt allo stato di consistenza delle argille — ancora oggi il riferimento più citato nella pratica geotecnica."},
                'Terzaghi-Peck (1967)': {v:true, testo:"Nella seconda edizione (1967) gli stessi autori estesero le correlazioni al peso di volume e alla resistenza a compressione semplice qu, assumendo la relazione approssimata cu ≈ qu/2."},
                'Meyerhof (1965)': {v:true, testo:"G.G. Meyerhof confrontò risultati di prove SPT e prove penetrometriche statiche (CPT) su numerosi siti per ricavare relazioni approssimate tra Nspt, densità relativa e angolo di attrito, distinguendo sabbie con diverso contenuto di limo."},
                'Meyerhof (1957)': {v:true, testo:"Stessa ricerca di Meyerhof (confronto SPT/CPT multi-sito), qui nella formulazione per la densità relativa che tiene conto della tensione litostatica."},
                'Meyerhof ed altri': {v:false, testo:"Riformulazione successiva, diffusa in manualistica, dell'approccio originale di Meyerhof per il peso di volume — non ho una fonte puntuale verificata per questa variante specifica."},
                'Peck-Hanson-Thorburn (1974)': {v:true, testo:"Dal testo «Foundation Engineering» (2ª ed., Wiley): una correlazione lineare semplificata Nspt–angolo di attrito, pensata per un uso rapido in fase di progetto."},
                'Sowers (1961)': {v:false, testo:"Correlazione lineare per sabbie in genere, nello spirito delle semplificazioni pratiche di Terzaghi-Peck e Meyerhof — fonte puntuale non verificata."},
                'De Mello (1971)': {v:false, testo:"Victor F. B. De Mello propose una correlazione che introduce esplicitamente la tensione litostatica efficace oltre a Nspt — fonte puntuale non verificata in questa sessione."},
                'Malcev (1964)': {v:false, testo:"Formulazione di origine est-europea che lega l'angolo di attrito sia a Nspt sia alla tensione litostatica in forma logaritmica — descrizione generale."},
                'Schmertmann (1975)': {v:true, testo:"John Schmertmann, tra i padri del metodo del fattore di influenza di deformazione per il calcolo dei cedimenti da prove penetrometriche."},
                'Schmertmann (1978)': {v:true, testo:"Correlazioni empiriche E–Nspt differenziate per granulometria (sabbie fini/medie/grossolane), dallo stesso filone di ricerca di Schmertmann."},
                'Shioi-Fukui (1982)': {v:false, testo:"Correlazione di tradizione giapponese (area delle norme per opere stradali) — descrizione generale."},
                'Owasaki & Iwasaki (1959)': {v:true, testo:"Il filone di ricerca più noto con questo nome è Ohsaki & Iwasaki (Soils and Foundations, 1973), sui moduli dinamici dei terreni per la progettazione antisismica in Giappone. L'anno 1959 non è quello più citato in letteratura: possibile refuso, non riverificabile con certezza."},
                'Wolff (1989)': {v:false, testo:"Thomas Wolff propose una correlazione quadratica per l'angolo di attrito che introduce esplicitamente la tensione litostatica, diffusa in manuali FHWA statunitensi."},
                'Hatanaka & Uchida (1996)': {v:true, testo:"Makoto Hatanaka e Akio Uchida (Soils and Foundations, 1996) usarono campioni di sabbia indisturbati ottenuti per congelamento e provati in laboratorio."},
                'Hara ed altri (1971)': {v:true, testo:"Ricerca giapponese su Soils and Foundations su modulo di taglio e resistenza al taglio dei terreni coesivi. Nota: la letteratura la cita comunemente come 1974, non 1971 — anno non riverificato con certezza."},
                'Begemann (1974)': {v:false, testo:"Piet Begemann, pioniere olandese della prova penetrometrica statica (CPT), propose una correlazione che tiene conto anche della tensione litostatica."},
                'Stroud (1974)': {v:true, testo:"Michael Stroud, su prove triassiali UU su argille del Regno Unito, definì cu = f1·N60 con f1 variabile per plasticità. Tra le correlazioni più citate nella pratica britannica.", avviso:"Uno studio del 2019 (White et al.) ha rilevato che con le attrezzature SPT moderne la correlazione originale tende a SOTTOSTIMARE cu — non usarla come unico riferimento su lavori importanti."},
                'De Beer (1983)': {v:false, testo:"Egon De Beer, figura di riferimento della scuola geotecnica belga — fonte puntuale non verificata per questa specifica correlazione."},
                'Fletcher (1965)': {v:false, testo:"Correlazione polinomiale Nspt–coesione, fonte puntuale non verificata."},
                'Houston (1960)': {v:false, testo:"Correlazione polinomiale Nspt–coesione, fonte puntuale non verificata."},
                'Sanglerat (1948)': {v:true, testo:"Guy Sanglerat, autore di «The Penetrometer and Soil Exploration», tra i primi a differenziare le correlazioni qu–Nspt per tipo di argilla. Nota: la letteratura la cita più spesso come 1972, non 1948."},
                'Schultze-Menzenbach (1961)': {v:false, testo:"Ricerca della scuola geotecnica tedesca del dopoguerra, con correlazioni lineari differenziate per granulometria."},
                "D'Apollonia ed altri (1970)": {v:false, testo:"Studio statunitense su cedimenti osservati di fondazioni superficiali su sabbia, con correlazioni E–Nspt lineari."},
                'Webb (1970)': {v:false, testo:"Correlazione E–Nspt lineare per sabbie sature e con fine plastico — fonte puntuale non verificata."},
                'Bowles (1982)': {v:true, testo:"Joseph Bowles raccolse nel suo testo «Foundation Analysis and Design» i range E–Nspt proposti da vari autori."},
                'Burland & Burbidge (1985)': {v:true, testo:"John Burland e Malcolm Burbidge svilupparono un metodo per la previsione dei cedimenti su terreni granulari, tra i più validati empiricamente."},
                'Tornaghi ed altri (1988)': {v:false, testo:"Correlazione E–Nspt con andamento a radice quadrata — fonte puntuale non verificata."},
                'Buismann-Sanglerat (1974)': {v:false, testo:"Estensione della tradizione di Sanglerat al modulo edometrico, differenziata tra sabbie e argille."},
                'Farrent (1963)': {v:false, testo:"Correlazione lineare per il modulo edometrico di sabbie anche ghiaiose — fonte puntuale non verificata."},
                'Menzenbach e Malcev': {v:false, testo:"Combinazione delle scuole tedesca ed est-europea per il modulo edometrico."},
                'Stroud e Butler (1975)': {v:true, testo:"Stroud e Butler estesero l'approccio del 1974 ai depositi glaciali del Regno Unito."},
                'Stroud (1989)': {v:false, testo:"Ulteriore estensione della ricerca di Stroud, qui al modulo elastico — fonte puntuale non verificata per questa estensione."},
                'Trofimenkov (1974)': {v:false, testo:"Ricerca sovietica/russa su fondazioni su pali e terreni granulari — fonte puntuale non verificata."},
                'Vesic (1970)': {v:false, testo:"Aleksandar Vesic propone un intervallo min–max, a riconoscimento dell'ampia variabilità della correlazione."},
                'Gibbs e Holtz (1957)': {v:true, testo:"Harold Gibbs e Wendell Holtz condussero prove in camera di calibrazione su sabbie a densità nota, per isolare l'effetto della tensione di confinamento."},
                'Skempton (1986)': {v:true, testo:"Alec Skempton risistematizzò le correlazioni Nspt–densità relativa tenendo conto della normalizzazione dell'energia (N60) e della tensione litostatica."},
                'Bazara (1967)': {v:false, testo:"Correlazione per sabbie e ghiaie con soglia sulla tensione litostatica — fonte puntuale non verificata."},
                'Yoshida e Kokusho (1988)': {v:false, testo:"Ricerca giapponese con correlazioni a potenza differenziate per percentuale di ghiaia nella miscela."},
                'Otha & Goto (1978)': {v:true, testo:"Yoshimichi Ohta e Nobuto Goto (spesso citati come 1976) svilupparono una correlazione tra Nspt e Vs, da cui si deriva Gmax = ρ·Vs² — tra le correlazioni Nspt-Gmax più usate al mondo."},
                'Robertson e Campanella (1983)': {v:true, testo:"Peter Robertson e Richard Campanella studiarono il rapporto qc/Nspt in funzione della granulometria media (D50).", avviso:"Su sabbie carbonatiche questo tipo di correlazione funziona molto peggio che su sabbie silicee — su strati calcarenitici/carbonatici usare un margine di cautela più ampio."},
                'Crespellani & Vannucchi': {v:false, testo:"Autori italiani di testi universitari di geotecnica di riferimento in Italia — correlazione non verificata puntualmente."},
                'Robertson (1983)': {v:true, testo:"Peter Robertson propose rapporti approssimati qc/Nspt differenziati per tipo di terreno.", avviso:"Stesso avviso di Robertson e Campanella: affidabilità ridotta sui terreni carbonatici/calcarenitici."},
            };
            function notaScientificaDi(autore){ return NOTE_SCIENTIFICHE[autore] ?? null; }

            function categorieApplicabili(strato){
                return CATEGORIE.filter(cat => candidatiCompatibili(cat, strato).length>0);
            }

