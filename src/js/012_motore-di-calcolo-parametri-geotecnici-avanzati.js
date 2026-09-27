            // =========================================================================
            // MOTORE DI CALCOLO PARAMETRI GEOTECNICI AVANZATI (Modulo 2 integrato)
            // Formule verificate riga per riga su Nardò_DPSH1.ods (fogli INPUT/OUTPUT/
            // RIEPILOGO/TABELLE). Ogni strato di state.strati (dato di PROGETTO, condiviso
            // fra tutte le prove del cantiere) può avere strato.parametriAvanzati =
            // { [categoriaId]: { autoreIndex } } con le scelte fatte in questa vista.
            // =========================================================================

            // ---- Tabella peso di volume Terzaghi-Peck ----
            const TABELLA_PESO_VOLUME = [
                {s:0,secco:1.33,saturo:1.83},{s:5,secco:1.41,saturo:1.88},{s:10,secco:1.5,saturo:1.93},
                {s:15,secco:1.54,saturo:1.96},{s:20,secco:1.59,saturo:1.99},{s:25,secco:1.64,saturo:2.02},
                {s:30,secco:1.69,saturo:2.05},{s:35,secco:1.73,saturo:2.08},{s:40,secco:1.77,saturo:2.1},
                {s:45,secco:1.81,saturo:2.13},{s:50,secco:1.85,saturo:2.15},{s:55,secco:1.87,saturo:2.16},
                {s:60,secco:1.88,saturo:2.17},{s:65,secco:1.9,saturo:2.18},{s:70,secco:1.92,saturo:2.19},
                {s:75,secco:1.93,saturo:2.2},{s:80,secco:1.95,saturo:2.21},{s:85,secco:1.97,saturo:2.23},
                {s:90,secco:1.99,saturo:2.24},{s:95,secco:1.99,saturo:2.24},
            ];
            function lookupPesoVolume(n){
                if(n==null||Number.isNaN(n))return{secco:null,saturo:null};
                const f=Math.floor(n/5)*5,c=Math.ceil(n/5)*5;
                const soglia=Math.max(0,Math.min(95,(n-f<=2.5)?f:c));
                const r=TABELLA_PESO_VOLUME.find(x=>x.s===soglia);
                return r?{secco:r.secco,saturo:r.saturo}:{secco:null,saturo:null};
            }

            // ---- Stato di consistenza A.G.I. 1977 ----
            const SOGLIE_GRAN=[{s:4,l:'SCIOLTO'},{s:10,l:'POCO ADDENSATO'},{s:30,l:'MODERATAM. ADDENSATO'},{s:50,l:'ADDENSATO'},{s:Infinity,l:'MOLTO ADDENSATO'}];
            const SOGLIE_COES=[{s:2,l:'PRIVO DI CONSISTENZA'},{s:4,l:'POCO CONSISTENTE'},{s:8,l:'MODERATAM. CONSISTENTE'},{s:15,l:'CONSISTENTE'},{s:30,l:'MOLTO CONSISTENTE'},{s:Infinity,l:'ESTREMAM. CONSISTENTE'}];
            function classificaConsistenza({isCoesivo,nsptFalda,nsptGrezzo}){
                const v=isCoesivo?nsptGrezzo:nsptFalda, soglie=isCoesivo?SOGLIE_COES:SOGLIE_GRAN;
                if(v==null)return null;
                for(const r of soglie) if(v<r.s) return r.l;
                return soglie[soglie.length-1].l;
            }

            // ---- Densità relativa Skempton "limi e sabbie" (riusata da Angolo attrito) ----
            function drSkemptonLimiSabbie({nsptFalda:x}){
                const v=6.2277645+3.1873281*x-0.05536254*x**2+0.0004253959*x**3;
                return v>100?100:v;
            }
            const clamp100=v=>v>100?100:v;

            // ---- Registro categorie (8 famiglie, ~50 candidati totali) ----
            const CATEGORIE = [
                { id:'pesoDiVolume', label:'Peso di volume', unita:'t/m³', applicabilita:'sempre',
                    spiegazione:'Stima quanto pesa un metro cubo di terreno. Serve come base per quasi tutti gli altri calcoli, quindi va scelto per primo.',
                    candidati:[
                        { autore:'Terzaghi-Peck (1967)', terreno:null,
                            calcola:(c)=>lookupPesoVolume(c.nsptFalda) },
                        { autore:'Meyerhof ed altri', terreno:null,
                            calcola:(c)=>{ const x=c.nsptFalda; if(x==null)return{secco:null,saturo:null};
                                const secco=0.01*x+1.5;
                                const satIncoerente=x<=50?1.8559+0.0062*x:2.0414+0.0021*x;
                                const satCoesivo=x<18?1/(0.5449-0.0025*x):1/(0.59-0.0056*x);
                                return {secco, saturo:c.isCoesivo?satCoesivo:satIncoerente}; } },
                    ] },

                { id:'angoloAttrito', label:'Angolo di attrito', unita:'°', applicabilita:'granulare',
                    spiegazione:'Misura quanto il terreno resiste a scorrere su se stesso. Ha senso solo per terreni granulari (sabbie, ghiaie): ogni autore propone una formula diversa in base al tipo di sabbia osservata.',
                    candidati:[
                        {autore:'Meyerhof (1965)',terreno:'sabbie con limo < 5%',calcola:({nsptFalda:x})=>29.47+0.46*x-0.004*x**2},
                        {autore:'Meyerhof (1965)',terreno:'sabbie con limo > 5%',calcola:({nsptFalda:x})=>23.7+0.57*x-0.006*x**2},
                        {autore:'Peck-Hanson-Thorburn (1974)',terreno:'sabbie compatte e ghiaie',calcola:({nsptFalda:x})=>27.2+0.28*x},
                        {autore:'Sowers (1961)',terreno:'sabbie in genere',calcola:({nsptFalda:x})=>28+0.28*x},
                        {autore:'De Mello (1971)',terreno:'sabbie fino a ghiaiose',calcola:({nsptFalda:x,sigmaV0})=>19-(0.38*sigmaV0)/10+8.73*Math.log(x)},
                        {autore:'Malcev (1964)',terreno:'sabbie in genere',calcola:({nsptFalda:x,sigmaV0})=>20-5*Math.log(sigmaV0/10)+3.73*Math.log(x)},
                        {autore:'Schmertmann (1975)',terreno:null,calcola:({nsptFalda:x,sigmaV0})=>(Math.atan((x/(12.2+(20.3*sigmaV0)/10))**0.34))*180/Math.PI},
                        {autore:'Schmertmann (1978)',terreno:'sabbie fini',calcola:(c)=>28+0.14*drSkemptonLimiSabbie(c)},
                        {autore:'Schmertmann (1978)',terreno:'sabbie medie',calcola:(c)=>31.5+0.1*drSkemptonLimiSabbie(c)},
                        {autore:'Schmertmann (1978)',terreno:'sabbie grossolane',calcola:(c)=>34.5+0.1*drSkemptonLimiSabbie(c)},
                        {autore:'Schmertmann (1978)',terreno:'ghiaie e sabbie, ghiaietto',calcola:(c)=>38+0.08*drSkemptonLimiSabbie(c)},
                        {autore:'Shioi-Fukui (1982)',terreno:'sabbie fini e limi',calcola:({nsptFalda:x})=>Math.sqrt(15*x)+15},
                        {autore:'Shioi-Fukui (1982)',terreno:'sabbie medie e ghiaiose',calcola:({nsptFalda:x})=>0.3*x+27},
                        {autore:'Owasaki & Iwasaki (1959)',terreno:'sabbie fino a ghiaiose',calcola:({nsptFalda:x})=>Math.sqrt(20*x)+15},
                        {autore:'Wolff (1989)',terreno:'sabbie fini',calcola:({nsptFalda:x,sigmaV0})=>{const k=(2/(1+sigmaV0/10))*x;return 27.1+0.3*k-0.00054*k**2;}},
                        {autore:'Wolff (1989)',terreno:'sabbie grosse',calcola:({nsptFalda:x,sigmaV0})=>{const k=(3/(2+sigmaV0/10))*x;return 27.1+0.3*k-0.00054*k**2;}},
                        {autore:'Hatanaka & Uchida (1996)',terreno:'sabbie fini o limose',calcola:({n160})=>20+Math.sqrt(15.4*n160)},
                    ] },

                { id:'coesioneNonDrenata', label:'Coesione non drenata', unita:'kg/cm²', applicabilita:'coesivo',
                    spiegazione:'Misura la resistenza di un’argilla satura quando viene caricata rapidamente (senza drenaggio). Ha senso solo per terreni coesivi.',
                    candidati:[
                        {autore:'Terzaghi-Peck (1948)',terreno:'argille a bassa plasticità',calcola:({nsptGrezzo:x})=>0.038*x},
                        {autore:'Terzaghi-Peck (1948)',terreno:'arg. a medio-bassa plast.',calcola:({nsptGrezzo:x})=>0.067*x},
                        {autore:'Terzaghi-Peck (1948)',terreno:'argille a media plasticità',calcola:({nsptGrezzo:x})=>0.074*x},
                        {autore:'Terzaghi-Peck (1948)',terreno:'argille ad alta plasticità',calcola:({nsptGrezzo:x})=>0.125*x},
                        {autore:'Terzaghi-Peck (1948)',terreno:'argille sabbioso siltose',calcola:({nsptGrezzo:x})=>x<8?(0.125*x)/2:(0.135*x)/2},
                        {autore:'Terzaghi-Peck (1948)',terreno:'argille marnose fratturate',calcola:({nsptGrezzo:x})=>(0.145*x)/2},
                        {autore:'Hara ed altri (1971)',terreno:null,calcola:({nsptGrezzo:x})=>29*x**0.72*0.0102},
                        {autore:'Begemann (1974)',terreno:null,calcola:({nsptGrezzo:x,sigmaV0})=>(2.5*x-sigmaV0)/14},
                        {autore:'Stroud (1974)',terreno:null,calcola:({nsptGrezzo:x})=>4.4*x*0.0102},
                        {autore:'De Beer (1983)',terreno:null,calcola:({nsptGrezzo:x})=>(2.5*x)/20},
                        {autore:'Fletcher (1965)',terreno:null,calcola:({nsptGrezzo:x})=>0.1844*x-(0.00074*x**2)/2},
                        {autore:'Houston (1960)',terreno:null,calcola:({nsptGrezzo:x})=>(0.00126*(x**2+0.1384*x+0.889))/2},
                        {autore:'Sanglerat (1948)',terreno:'argille a bassa plasticità',calcola:({nsptGrezzo:x})=>(0.625*x-1)/15},
                        {autore:'Sanglerat (1948)',terreno:'argille limoso sabbiose',calcola:({nsptGrezzo:x})=>(0.133*x)/2},
                        {autore:'Sanglerat (1948)',terreno:'argille plastiche',calcola:({nsptGrezzo:x})=>(0.25*x)/2},
                        {autore:'Sanglerat (1948)',terreno:'argille siltose',calcola:({nsptGrezzo:x})=>0.1*x},
                        {autore:'Schmertmann (1978)',terreno:'valori medi',calcola:({nsptGrezzo:x})=>0.07*x},
                        {autore:'Schmertmann (1978)',terreno:'valori massimi',calcola:({nsptGrezzo:x})=>0.0954*x**1.01187},
                        {autore:'Shioi-Fukui (1982)',terreno:'argille a bassa plasticità',calcola:({nsptGrezzo:x})=>(0.05*x)/2},
                        {autore:'Shioi-Fukui (1982)',terreno:'argille a media plasticità',calcola:({nsptGrezzo:x})=>0.05*x},
                        {autore:'Shioi-Fukui (1982)',terreno:'argille ad alta plasticità',calcola:({nsptGrezzo:x})=>0.1*x},
                    ] },

                { id:'moduloElastico', label:'Modulo elastico (Young)', unita:'kg/cm²', applicabilita:'misto',
                    spiegazione:'Descrive quanto il terreno si deforma sotto carico. Alcune formule valgono per sabbie, altre per argille: scegli solo tra quelle coerenti con la natura di questo strato.',
                    candidati:[
                        {autore:'Schmertmann (1978)',terreno:'sabbie fini',natura:'granulare',calcola:({nsptFalda:x})=>8*x},
                        {autore:'Schmertmann (1978)',terreno:'sabbie medie',natura:'granulare',calcola:({nsptFalda:x})=>12*x},
                        {autore:'Schmertmann (1978)',terreno:'sabbie grossolane',natura:'granulare',calcola:({nsptFalda:x})=>20*x},
                        {autore:'Schmertmann (1978)',terreno:'limi siltoso sabbiosi (min)',natura:'granulare',calcola:({nsptFalda:x})=>6.29781*x-1.82356},
                        {autore:'Schmertmann (1978)',terreno:'limi siltoso sabbiosi (max)',natura:'granulare',calcola:({nsptFalda:x})=>8.74759*x-0.28389},
                        {autore:'Schultze-Menzenbach (1961)',terreno:'sabbie fini',natura:'granulare',calcola:({nsptFalda:x,inFalda})=>inFalda==='SI'?71+4.9*x:52+3.3*x},
                        {autore:'Schultze-Menzenbach (1961)',terreno:'sabbie medie',natura:'granulare',calcola:({nsptFalda:x})=>39+4.5*x},
                        {autore:'Schultze-Menzenbach (1961)',terreno:'sabbie limose',natura:'granulare',calcola:({nsptFalda:x})=>24+5.3*x},
                        {autore:'Schultze-Menzenbach (1961)',terreno:'limi siltoso sabbiosi',natura:'granulare',calcola:({nsptFalda:x})=>12+5.8*x},
                        {autore:'Schultze-Menzenbach (1961)',terreno:'sabbie ghiaiose',natura:'granulare',calcola:({nsptFalda:x})=>43+11.8*x},
                        {autore:'Schultze-Menzenbach (1961)',terreno:'sabbie e ghiaie',natura:'granulare',calcola:({nsptFalda:x})=>38+10.5*x},
                        {autore:'Schultze-Menzenbach (1961)',terreno:'limi argillosi (IP<15)',natura:'coesivo',calcola:({nsptGrezzo:x})=>4+11.5*x-24.4},
                        {autore:'Schultze-Menzenbach (1961)',terreno:'limi argillosi (IP>15)',natura:'coesivo',calcola:({nsptGrezzo:x})=>4+11.5*x+24.4},
                        {autore:"D'Apollonia ed altri (1970)",terreno:'sabbie',natura:'granulare',calcola:({nsptFalda:x})=>7.5*x+18},
                        {autore:"D'Apollonia ed altri (1970)",terreno:'sabbie e ghiaie',natura:'granulare',calcola:({nsptFalda:x})=>7.71*x+19.1},
                        {autore:"D'Apollonia ed altri (1970)",terreno:'sabbie SC',natura:'granulare',calcola:({nsptFalda:x})=>10.63*x+37.5},
                        {autore:'Webb (1970)',terreno:'sabbie sature',natura:'granulare',calcola:({nsptFalda:x})=>4.87*x+73},
                        {autore:'Webb (1970)',terreno:'sabbie con fine plastico',natura:'granulare',calcola:({nsptFalda:x})=>3.22*x+16},
                        {autore:'Bowles (1982)',terreno:'sabbie argillose',natura:'granulare',calcola:({nsptFalda:x})=>3.2*(x+15)},
                        {autore:'Bowles (1982)',terreno:'sabbie limose, limi sabb.',natura:'granulare',calcola:({nsptFalda:x})=>3*(x+6)},
                        {autore:'Bowles (1982)',terreno:'sabbie medie',natura:'granulare',calcola:({nsptFalda:x})=>5*(x+15)},
                        {autore:'Bowles (1982)',terreno:'sabbie ghiaiose e ghiaie',natura:'granulare',calcola:({nsptFalda:x})=>12*(x+6)},
                        {autore:'Burland & Burbidge (1985)',terreno:null,natura:'granulare',calcola:({nsptFalda:x})=>x<=4?x*2.4:x<=10?x*3.4:x<=30?x*5.6:x*7},
                        {autore:'Tornaghi ed altri (1988)',terreno:'sabbie, sabbie e ghiaie',natura:'granulare',calcola:({nsptFalda:x})=>7*Math.sqrt(x)*10.19716},
                        {autore:'Stroud (1989)',terreno:'sabbie e ghiaie',natura:'granulare',calcola:({nsptFalda:x})=>20*x},
                        {autore:'Stroud (1989)',terreno:'argille',natura:'coesivo',calcola:({nsptGrezzo:x})=>9*x},
                    ] },

                { id:'moduloEdometrico', label:'Modulo edometrico', unita:'kg/cm²', applicabilita:'misto',
                    spiegazione:'Descrive la comprimibilità del terreno sotto carico verticale confinato — usato per stimare i cedimenti nel tempo.',
                    candidati:[
                        {autore:'Buismann-Sanglerat (1974)',terreno:'sabbie',natura:'granulare',calcola:({nsptFalda:x})=>6*x},
                        {autore:'Buismann-Sanglerat (1974)',terreno:'sabbie argillose',natura:'granulare',calcola:({nsptFalda:x})=>8*x},
                        {autore:'Buismann-Sanglerat (1974)',terreno:'argille sabbiose',natura:'coesivo',calcola:({nsptGrezzo:x})=>x<=10?5*x:7.5*x},
                        {autore:'Buismann-Sanglerat (1974)',terreno:'argille compatte',natura:'coesivo',calcola:({nsptGrezzo:x})=>x<=10?12.5*x:10*x},
                        {autore:'Farrent (1963)',terreno:'sabbie anche con ghiaie',natura:'granulare',calcola:({nsptFalda:x})=>7.1*x},
                        {autore:'Menzenbach e Malcev',terreno:'sabbie fini',natura:'granulare',calcola:({nsptFalda:x})=>3.54*x+38},
                        {autore:'Menzenbach e Malcev',terreno:'sabbie medie',natura:'granulare',calcola:({nsptFalda:x})=>4.46*x+38},
                        {autore:'Menzenbach e Malcev',terreno:'sabbie e ghiaie',natura:'granulare',calcola:({nsptFalda:x})=>10.46*x+38},
                        {autore:'Menzenbach e Malcev',terreno:'sabbie ghiaiose',natura:'granulare',calcola:({nsptFalda:x})=>11.84*x+38},
                        {autore:'Begemann (1974)',terreno:'limi con sabbie',natura:'granulare',calcola:({nsptFalda:x})=>2.05403*x+27.46451},
                        {autore:'Begemann (1974)',terreno:'ghiaie con sabbie',natura:'granulare',calcola:({nsptFalda:x})=>9.1*x+93},
                        {autore:'Stroud e Butler (1975)',terreno:'litotipi a bassa plasticità',natura:'coesivo',calcola:({nsptGrezzo:x})=>6*x},
                        {autore:'Stroud e Butler (1975)',terreno:'litotipi a media plasticità',natura:'coesivo',calcola:({nsptGrezzo:x})=>5*x},
                        {autore:'Trofimenkov (1974)',terreno:null,natura:'granulare',calcola:({nsptFalda:x})=>10.1993*x+1.7919},
                        {autore:'Vesic (1970)',terreno:'valori minimi',natura:'granulare',calcola:({nsptFalda:x})=>9*x},
                        {autore:'Vesic (1970)',terreno:'valori massimi',natura:'granulare',calcola:({nsptFalda:x})=>15*x},
                    ] },

                { id:'densitaRelativa', label:'Densità relativa', unita:'%', applicabilita:'granulare',
                    spiegazione:'Indica quanto è “addensata” una sabbia o ghiaia rispetto al suo stato più sciolto e più denso possibile. Non è definita per le argille.',
                    candidati:[
                        {autore:'Meyerhof (1957)',terreno:'da limi a ghiaie',calcola:({nsptFalda:x,sigmaV0})=>clamp100(21*Math.sqrt(x/(0.7+sigmaV0/10)))},
                        {autore:'Gibbs e Holtz (1957)',terreno:null,calcola:({nsptFalda:x,sigmaV0})=>clamp100(21*Math.sqrt(x/(0.7+sigmaV0)))},
                        {autore:'Skempton (1986)',terreno:'sabbie fini',calcola:({nsptFalda:x,sigmaV0})=>clamp100(100*Math.sqrt(((2/(1+sigmaV0/10))*x)/60))},
                        {autore:'Skempton (1986)',terreno:'sabbie grosse',calcola:({nsptFalda:x,sigmaV0})=>clamp100(100*Math.sqrt(((3/(2+sigmaV0/10))*x)/60))},
                        {autore:'Skempton (1986)',terreno:'limi e sabbie',calcola:(c)=>drSkemptonLimiSabbie(c)},
                        {autore:'Skempton (1986)',terreno:'sabbie da fini a grosse',calcola:({nsptFalda:x,sigmaV0})=>clamp100(100*Math.sqrt(x/(32+(0.288*sigmaV0)/10)))},
                        {autore:'Schultze-Menzenbach (1961)',terreno:'sabbie da fini a ghiaiose',calcola:({nsptFalda:x,sigmaV0})=>clamp100(Math.exp(0.478*Math.log(x)-0.262*Math.log(sigmaV0/10)+2.84))},
                        {autore:'Bazara (1967)',terreno:'sabbie e ghiaie',calcola:({nsptFalda:x,sigmaV0})=>{const v=sigmaV0<=7.32?Math.sqrt(x/20/(1+(4.1*sigmaV0)/10)):Math.sqrt(x/20/(3.24+(1.024*sigmaV0)/10));return clamp100(v*100);}},
                        {autore:'Yoshida e Kokusho (1988)',terreno:'sabbie fini',calcola:({nsptFalda:x,sigmaV0})=>clamp100(22*x**0.57*(10*sigmaV0)**-0.14)},
                        {autore:'Yoshida e Kokusho (1988)',terreno:'sabbie 75%, ghiaie 25%',calcola:({nsptFalda:x,sigmaV0})=>clamp100(18*x**0.57*(10*sigmaV0)**-0.14)},
                        {autore:'Yoshida e Kokusho (1988)',terreno:'sabbie e ghiaie 50%',calcola:({nsptFalda:x,sigmaV0})=>clamp100(25*x**0.44*(10*sigmaV0)**-0.13)},
                        {autore:'Yoshida e Kokusho (1988)',terreno:'tutti i terreni granulari',calcola:({nsptFalda:x,sigmaV0})=>clamp100(25*x**0.46*(10*sigmaV0)**-0.12)},
                    ] },

                { id:'moduloTaglio', label:'Modulo di taglio', unita:'kg/cm²', applicabilita:'misto',
                    spiegazione:'Descrive la rigidezza del terreno alle sollecitazioni orizzontali/dinamiche — parametro chiave per le verifiche sismiche.',
                    candidati:[
                        {autore:'Owasaki & Iwasaki (1959)',terreno:'sabbie pulite',natura:'granulare',calcola:({nsptFalda:x})=>(650*x**0.94)/10},
                        {autore:'Owasaki & Iwasaki (1959)',terreno:'sabbie con fine plastico',natura:'granulare',calcola:({nsptFalda:x})=>(1182*x**0.76)/10},
                        {autore:'Owasaki & Iwasaki (1959)',terreno:'limi plastici e argille',natura:'coesivo',calcola:({nsptGrezzo:x})=>(1400*x**0.78)/10},
                        {autore:'Otha & Goto (1978)',terreno:'sabbie fini',natura:'granulare',calcola:({nsptFalda:x,pesoSaturoSelezionato:p,profonditaMedia:h})=>p*(6.73*x**0.171*h**0.199*1.07)**2},
                        {autore:'Otha & Goto (1978)',terreno:'sabbie medie',natura:'granulare',calcola:({nsptFalda:x,pesoSaturoSelezionato:p,profonditaMedia:h})=>p*(6.73*x**0.171*h**0.199*1.09)**2},
                        {autore:'Otha & Goto (1978)',terreno:'sabbie grosse',natura:'granulare',calcola:({nsptFalda:x,pesoSaturoSelezionato:p,profonditaMedia:h})=>p*(6.73*x**0.171*h**0.199*1.14)**2},
                        {autore:'Otha & Goto (1978)',terreno:'sabbie ghiaiose',natura:'granulare',calcola:({nsptFalda:x,pesoSaturoSelezionato:p,profonditaMedia:h})=>p*(6.73*x**0.171*h**0.199*1.15)**2},
                        {autore:'Otha & Goto (1978)',terreno:'ghiaie e ghiaie sabbiose',natura:'granulare',calcola:({nsptFalda:x,pesoSaturoSelezionato:p,profonditaMedia:h})=>p*(6.73*x**0.171*h**0.199*1.45)**2},
                        {autore:'Robertson e Campanella (1983)',terreno:'sabbie',natura:'granulare',calcola:({nsptFalda:x})=>125*x**0.611},
                        {autore:'Crespellani & Vannucchi',terreno:'sabbie in generale',natura:'granulare',calcola:({nsptFalda:x})=>79.4*x**0.611},
                    ] },

                { id:'resistenzaCPT', label:'Resistenza punta CPT equivalente', unita:'kg/cm²', applicabilita:'misto',
                    spiegazione:'Stima cosa avrebbe misurato una prova CPT nello stesso punto, per confrontare i risultati con altre indagini in sito.',
                    candidati:[
                        {autore:'Robertson (1983)',terreno:'limi e limi sabbiosi',natura:'granulare',calcola:({nsptFalda:x})=>2*x},
                        {autore:'Robertson (1983)',terreno:'limi sabbiosi, sabbie limose',natura:'granulare',calcola:({nsptFalda:x})=>3*x},
                        {autore:'Robertson (1983)',terreno:'sabbie e ghiaie',natura:'granulare',calcola:({nsptFalda:x})=>4*x},
                        {autore:'Robertson (1983)',terreno:'argille limose o sabb. (min)',natura:'coesivo',calcola:({nsptFalda:x})=>1.5*x},
                        {autore:'Robertson (1983)',terreno:'argille limose o sabb. (max)',natura:'coesivo',calcola:({nsptFalda:x})=>1.9*x},
                    ] },
            ];
            const CATEGORIE_PER_ID = Object.fromEntries(CATEGORIE.map(c=>[c.id,c]));

            // NB: le categorie 'misto' (moduloElastico, moduloEdometrico, moduloTaglio,
            // resistenzaCPT) mostrano SEMPRE tutte le loro varianti, indipendentemente dal campo
            // "natura" di ciascun candidato — verificato sul report originale Eurisko (pagine
            // "Allegato"): lì compaiono fianco a fianco, con valori reali (mai #N/D), sia varianti
            // granulari sia coesive per lo stesso strato (es. "limi plastici e argille" accanto a
            // "sabbie fini" nella stessa tabella "Modulo di taglio"). In precedenza qui si
            // filtrava per c.natura===natura dello strato, nascondendo nel wizard varianti che il
            // documento originale mostra sempre: "natura" resta solo un tag informativo/di
            // suggerimento (usato altrove per l'etichetta "granulare"/"coesivo"), non un filtro.
            function candidatiCompatibili(categoria, strato){
                if(categoria.applicabilita==='sempre' || categoria.applicabilita==='misto') return categoria.candidati;
                if(categoria.applicabilita==='granulare') return strato.isIncoerente?categoria.candidati:[];
                if(categoria.applicabilita==='coesivo') return strato.isCoesivo?categoria.candidati:[];
                return categoria.candidati;
            }

            // ---- Pre-elaborazione + cascata sigma'v0 (identica al foglio OUTPUT) ----
            function calcolaCr(prof){ return prof<4?0.7:prof<6?0.85:prof<10?0.95:1; }
            function calcolaN160(nf,cr,s0){ const r=Math.sqrt(0.9765/s0); return r>1.5?nf*cr*1.5:nf*cr*r; }
            function condizioneFalda(da,a,faldaDa,faldaA){
                if(a<=faldaDa) return 'NO';
                if(da>=faldaA) return 'NO';
                if(a>faldaDa && da<faldaDa) return 'IN PARTE';
                return 'SI';
            }
            /** Elabora una prova: riceve l'elenco ordinato (dal più superficiale al più profondo)
             * degli strati EFFETTIVAMENTE presenti in questa prova (con profonditaDa/A, nsptGrezzo,
             * nsptFalda, isCoesivo e parametriAvanzati già aggregati da stratiEffettiviProva()) e la
             * falda di questa prova; ritorna, per ciascuno, pre-elaborazione + candidati/valori per
             * ogni categoria + derivati (K0, Poisson, qu). Porting 1:1 del foglio OUTPUT. */
            function elaboraStratiProva(strati, falda){
                const {faldaDa,faldaA}=falda;
                let baseCumulata=0, sommaGammaHPrec=0;
                const preElab=[];
                for(const strato of strati){
                    const {profonditaDa:da,profonditaA:a,nsptGrezzo,nsptFalda,isCoesivo}=strato;
                    const spessore=a-da;
                    const profonditaMedia=spessore/2+baseCumulata;
                    const inFalda=condizioneFalda(da,a,faldaDa,faldaA);

                    const catPeso=CATEGORIE_PER_ID.pesoDiVolume;
                    const candPeso=candidatiCompatibili(catPeso,strato);
                    const idxScelto=strato.parametriAvanzati?.pesoDiVolume?.autoreIndex;
                    const candidatoPeso=(idxScelto!=null&&candPeso[idxScelto])||candPeso[0];
                    const {secco:pesoSecco,saturo:pesoSaturo}=candidatoPeso.calcola({nsptFalda,isCoesivo});

                    let gammaH;
                    if(inFalda==='NO') gammaH=pesoSecco*spessore;
                    else if(inFalda==='SI') gammaH=pesoSaturo*spessore-spessore;
                    else gammaH=pesoSecco*(faldaDa-da)+pesoSaturo*(a-faldaDa)-(a-faldaDa);

                    let gammaHmezzi;
                    if(profonditaMedia<=faldaDa) gammaHmezzi=(pesoSecco*spessore)/2;
                    else gammaHmezzi=pesoSecco*(faldaDa-da)+pesoSaturo*(profonditaMedia-faldaDa)-(profonditaMedia-faldaDa);

                    const contributoProprio = inFalda==='IN PARTE'?gammaHmezzi:gammaH/2;
                    const sigmaV0=contributoProprio+sommaGammaHPrec;
                    const cr=calcolaCr(profonditaMedia);
                    const n160=calcolaN160(nsptFalda,cr,sigmaV0);
                    const statoConsistenza=classificaConsistenza({isCoesivo,nsptFalda,nsptGrezzo});

                    preElab.push({spessore,profonditaMedia,inFalda,pesoSecco,pesoSaturo,gammaH,sigmaV0,cr,n160,statoConsistenza,nsptGrezzo,nsptFalda});
                    baseCumulata=a; sommaGammaHPrec+=gammaH;
                }

                return strati.map((strato,i)=>{
                    const pre=preElab[i];
                    const ctx={nsptFalda:strato.nsptFalda,nsptGrezzo:strato.nsptGrezzo,sigmaV0:pre.sigmaV0,
                        n160:pre.n160,profonditaMedia:pre.profonditaMedia,inFalda:pre.inFalda,
                        isCoesivo:strato.isCoesivo,pesoSaturoSelezionato:pre.pesoSaturo};
                    const categorie={};
                    for(const categoria of CATEGORIE){
                        const ok=candidatiCompatibili(categoria,strato);
                        const preview=ok.map((c,index)=>({index,autore:c.autore,terreno:c.terreno,natura:c.natura??null,valore:c.calcola(ctx)}));
                        const idx=strato.parametriAvanzati?.[categoria.id]?.autoreIndex;
                        categorie[categoria.id]={candidati:preview, selezionato: idx!=null? (preview.find(p=>p.index===idx)??null) : null};
                    }
                    const phi=categorie.angoloAttrito?.selezionato?.valore ?? null;
                    const derivati={
                        qu: strato.nsptFalda!=null? 12*strato.nsptFalda*0.0102 : null,
                        K0: phi!=null? 1-Math.sin(phi*Math.PI/180) : null,
                        poisson: phi!=null? 0.1+(0.3*(phi-25))/20 : null,
                    };
                    return {stratoId:strato.id, preElaborazione:pre, categorie, derivati};
                });
            }

            // ---- Tassonomia litologica (per il badge "suggerito") ----
            // NB: si usano RADICI (non forme singole) per coprire tutte le declinazioni
            // italiane (ghiaia/ghiaie/ghiaioso/ghiaiosa/ghiaiose/ghiaiosi...) — una lista
            // di forme esatte lascerebbe sempre buchi.
            const TASSONOMIA=[
                {categoria:'GHIAIA',parole:['ghiai']},
                {categoria:'SABBIA',parole:['sabbi','arenari','calcarenit']},
                {categoria:'LIMO',parole:['limo','limi']},
                {categoria:'ARGILLA',parole:['argill']},
            ];
            function normalizzaTesto(t){return t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');}

            /** Trova TUTTE le categorie litologiche presenti in un testo (nome strato o "terreno" di un candidato). */
            function categorieDiTesto(testo){
                if(!testo) return [];
                const t=normalizzaTesto(testo), trovate=[];
                for(const v of TASSONOMIA) if(v.parole.some(p=>t.includes(normalizzaTesto(p)))) trovate.push(v.categoria);
                return trovate;
            }

            /** Categorie litologiche di uno strato per il meccanismo "consigliato": se l'utente
             * ha impostato una o più categorie manualmente (strato.categorieManuali), quelle
             * hanno sempre la precedenza sul riconoscimento automatico dal nome — utile quando
             * il nome non contiene nessuna parola riconosciuta, o quando un termine come
             * "calcarenite" viene usato dal geologo per indicare un comportamento diverso da
             * quello letterale (es. sabbioso incoerente anziché roccia). Il riconoscimento dal
             * nome resta comunque il punto di partenza mostrato/preselezionato nei chip. */
            function categorieRiconosciuteDiStrato(strato){
                // Array.isArray, non "length > 0": un override manuale svuotato del tutto
                // (l'utente ha deselezionato ogni chip perché nessuna categoria calza) è uno
                // stato legittimo e distinto da "nessun override impostato" — altrimenti un
                // array vuoto ricadeva silenziosamente sul riconoscimento dal nome, e l'ultimo
                // chip rimasto risultava impossibile da togliere.
                if (Array.isArray(strato.categorieManuali)) return strato.categorieManuali;
                return categorieDiTesto(strato.name);
            }

            const RADICI_CARBONATICHE = ['arenari','calcarenit'];
            function stratoRischioCarbonatico(nome){
                if(!nome) return false;
                const t = normalizzaTesto(nome);
                return RADICI_CARBONATICHE.some(r=>t.includes(r));
            }

            /**
             * Un candidato è "consigliato" SOLO SE tutte le categorie litologiche che il
             * suo campo "terreno" nomina sono anche tra quelle riconosciute nel nome dello
             * strato — mai il contrario (una formula "sabbie e ghiaie" non viene mai
             * consigliata per uno strato riconosciuto come sola "Sabbia").
             */
            function valutaSuggerimento(candidato, categorieRiconosciute, nomeStrato){
                if(!candidato.terreno || categorieRiconosciute.length===0){
                    return {suggerito:false, categorieCandidato:[], extra:[], spiegazione:null};
                }
                const categorieCandidato = categorieDiTesto(candidato.terreno);
                if(categorieCandidato.length===0) return {suggerito:false, categorieCandidato:[], extra:[], spiegazione:null};

                const extra = categorieCandidato.filter(c=>!categorieRiconosciute.includes(c));
                const suggerito = extra.length===0;
                const elenco = categorieCandidato.map(c=>c.toLowerCase()).join(', ');
                const spiegazione = suggerito
                    ? `Il nome dello strato («${nomeStrato}») è stato riconosciuto come <b>${categorieRiconosciute.join(', ').toLowerCase()}</b>. Questa variante ("${candidato.terreno}") si applica solo a terreni di tipo <b>${elenco}</b>, quindi è compatibile.`
                    : `Non consigliata: questa variante ("${candidato.terreno}") riguarda anche <b>${extra.join(', ').toLowerCase()}</b>, che non risulta nel nome dello strato («${nomeStrato}»).`;

                return {suggerito, categorieCandidato, extra, spiegazione};
            }

            /**
             * Alcune categorie (es. "Resistenza punta CPT equivalente") non hanno, tra i loro
             * candidati, NESSUNA variante che copra esattamente le sole categorie litologiche
             * riconosciute nel nome dello strato (es. non esiste una formula "sabbie" pura, solo
             * combinazioni tipo "sabbie e ghiaie"): in quel caso valutaSuggerimento non marca mai
             * nulla come "suggerito" e l'utente resta senza alcun aiuto. Questo fallback scatta
             * SOLO quando, per l'intera categoria, nessun candidato è risultato compatibile al
             * 100%: individua la/e variante/i con il minor numero di materiali "extra" non
             * riconosciuti (il miglior compromesso disponibile) e le marca come suggerimento
             * "parziale", distinto visivamente da quello "pieno" e con spiegazione onesta sul
             * perché non è una corrispondenza esatta. */
            function applicaFallbackSuggerimentoParziale(candidati, categorieRiconosciute, nomeStrato){
                if(categorieRiconosciute.length===0) return candidati;
                if(candidati.some(c=>c.suggerito)) return candidati;
                const conOverlap = candidati.filter(c=>c.categorieCandidato.length>0 && c.categorieCandidato.some(cat=>categorieRiconosciute.includes(cat)));
                if(conOverlap.length===0) return candidati;
                const minExtra = Math.min(...conOverlap.map(c=>c.extra.length));
                return candidati.map(c=>{
                    if(c.categorieCandidato.length>0 && c.categorieCandidato.some(cat=>categorieRiconosciute.includes(cat)) && c.extra.length===minExtra){
                        const elencoExtra = c.extra.map(e=>e.toLowerCase()).join(', ');
                        return {...c, suggerito:true, parziale:true,
                            spiegazione:`Nessuna formula di questa categoria copre in modo esatto solo <b>${categorieRiconosciute.join(', ').toLowerCase()}</b> (il terreno riconosciuto nel nome «${nomeStrato}»): questa variante ("${c.terreno}") è la più vicina disponibile, ma include anche <b>${elencoExtra}</b>. Verificala con giudizio tecnico prima di usarla.`};
                    }
                    return c;
                });
            }

