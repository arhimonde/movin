# Part B2 - NOTES

## Sursa datelor și reproducibilitate
Fixture-ul `fixtures/detections.json` este schema normalizată generată pentru output real Roboflow, nu date mock. Payload-urile originale sunt păstrate în `fixtures/roboflow_raw/`; maparea `table → dining_table` este o decizie explicită pentru estimarea volumului. Scriptul de achiziție este `../part-a/scripts/fetch_roboflow.py`; păstrează payload-urile brute în `fixtures/roboflow_raw/` și normalizează răspunsurile Roboflow (`predictions[]`) către schema consumată de Part B. Manifestul conține 8 fotografii locale din patru camere, cu două unghiuri pentru fiecare cameră.

Pentru a rula o achiziție reală, scriptul te va întreba interactiv cheia API (caracterele nu apar pe ecran). Am ales modelul public `furniture-o6003/2` (Furniture, Object Detection, CC BY 4.0) din Roboflow Universe. Codul modelului este folosit prin endpointul serverless `https://serverless.roboflow.com`; nu trebuie să cauți un URL `detect.roboflow.com` separat.

Din directorul proiectului, execută:

```bash
python3 part-a/scripts/fetch_roboflow.py
```

Când apare `Roboflow API key (input hidden):`, lipește cheia și apasă Enter.

Cheia API nu este scrisă în repository. Modelul public și versiunea folosite sunt trecute în metadata generată de script (`fixtures/roboflow_raw/metadata.json`). Conversia bbox folosește formatul Roboflow centrat (`x`, `y`, `width`, `height`) și îl transformă în `[left, top, width, height]`. Clasele sunt mapate către tabela de volume; clasele necunoscute rămân în inventar cu volum `null`, iar clasele imobile primesc `movable: false`.

## Ce am implementat
Am implementat un modul TypeScript (fără framework-uri externe) care parcurge output-ul JSON brut (cu bbox-uri), aplică filtre și calculează un inventar cu cantități agregate. Am creat:
1. `src/types.ts` - Tipare clare pentru input și output.
2. `src/volumes.ts` - Dicționar de volume estimate.
3. `src/inventory.ts` - Modulul central care conține logica.
4. `tests/inventory.test.ts` - Unit tests complete.

## Răspunsuri la întrebările cerute:

### 1. Logica de deduplicare
Am folosit o regulă bazată pe **IoU (Intersection over Union) > 0.5** pentru obiectele din aceeași cameră și din aceeași clasă, pe care le-am grupat în "clustere" folosind metoda *Single Linkage*. Dacă o clasă nu are `bbox` (sau dacă nu există niciun bbox), logica face fallback automat la "numărul maxim de instanțe per poză".

**Unde eșuează?**
Deduplicarea pe bază de IoU în coordonatele 2D ale imaginii, aplicată între poze diferite, funcționează decent **doar** dacă pozele sunt aproape identice (unghi similar).
Dacă un client pozează peretele stâng (unde se află o comodă), și apoi pozează peretele drept (unde se află o ALTĂ comodă) - dar ambele sunt încadrate în poze exact la aceleași coordonate `[x,y,w,h]` în pixeli, algoritmul le va considera *un singur obiect* și va sub-evalua cantitatea!
Totodată, după cum reiese și din fixture-ul generat (la categoria Kitchen), dacă clientul face a doua poză mișcând telefonul chiar și puțin, scaunele din a doua poză vor avea o mică diferență de coordonate. IoU va scădea sub 0.5, iar scriptul va aduna scaunele (în cazul meu a rezultat 7 scaune în loc de 4, deoarece IoU-ul a fost ~0.35).

### 2. Threshold-ul de Confidence
Am ales un `threshold = 0.5`.
* **Dacă era 0.9**: Am fi pierdut obiecte valide (în fixture avem un Coffee Table la 0.51, sau un scaun la 0.68). O cotație care ignoră obiecte masive produce costuri pierdute masiv pentru firmă, pentru că vom trimite o mașină prea mică.
* **Dacă era 0.3**: Am fi inclus foarte multe "false positives" (ex: Mirror-ul de la 0.28). Asta înseamnă că supralicităm volumul, speriem clientul cu un preț prea mare și pierdem contractul. 0.5 reprezintă un punct de echilibru pe majoritatea modelelor pre-antrenate standard.

### 3. Review uman necesar
Aș cere revizie umană (sau feedback-ul clientului) ori de câte ori:
1. Un item are `volumeM3 === null`. Sistemul trebuie să notifice vânzările (sau clientul) că am găsit o "Cutie de carton" sau un obiect bizar necunoscut, ca să ceară detalii despre dimensiune.
2. Când numărul de instanțe dintr-o clasă crește alarmant din pricina eșecului de deduplicare (ex: 7 scaune de dining, deși în mod normal vin câte 4 sau 6).

### 4. Cel mai incomod caz din fixture
Cel mai incomod caz a fost prezența "persoanelor" și a "detectiilor multiple pentru același dulap". Modelul poate detecta uși (`door`), geamuri (`window`), sau persoane (`person`). Am fost obligat să hardcodez eliminarea explicită a clasei `person`, deoarece nu vrem să "mutăm clienții" și evident persoanele au volume destul de mari (0.1 - 0.2 m³) care pot altera totalul. Un alt caz incomod a fost lipsa unui volum definit pentru anumite obiecte. Am tratat acest aspect returnând `null` din funcția `getVolume`, iar scriptul de `cli.ts` le adaugă în consolă afișând `UNKNOWN` și nu strică calculul (dar randează un warning clar la final). 

## Sursele estimărilor de volum
Valorile sunt estimări de packing, nu dimensiuni exacte: am folosit produsul lățime × adâncime × înălțime pentru dimensiuni tipice publicate de IKEA (familiile de produse KALLAX, MALM, PAX, LACK și STRANDMON) și rotunjiri prudente pentru ambalare. Linkuri de referință: [IKEA KALLAX](https://www.ikea.com/us/en/cat/kallax-series-27534/), [IKEA MALM](https://www.ikea.com/us/en/cat/malm-series-) și [IKEA PAX](https://www.ikea.com/us/en/cat/pax-system-19086/). Valorile din `src/volumes.ts` trebuie tratate ca aproximări și validate de operațiuni înainte de folosirea comercială.

## Limitări lăsate intenționat
* UI-ul B3 există separat în `web/`; această secțiune descrie doar logica B2.
* Regula de deduplicare nu va fi perfectă pe poze luate din unghiuri majore. Soluția perfectă necesită *3D Pose estimation / SLAM*.
