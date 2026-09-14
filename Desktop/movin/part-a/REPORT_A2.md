# PART A - A2: Defining and Measuring Accuracy

## 1. Definirea Metricii: Volume-Weighted Absolute Error (VWAE)
Când cineva spune "modelul are o precizie de 85% mAP@50", pentru MOVIN acea informație este inutilizabilă. De ce? 
- **mAP@50** tratează toate clasele ca având aceeași importanță. O ratare a unui cuptor cu microunde este ponderată la fel cu ratarea unui pat dublu king-size. 
- În plus, mAP evaluează cât de precis este bounding box-ul (IoU). Pentru noi, dacă bounding box-ul e puțin strâmb, dar acoperă canapeaua, este la fel de bun ca un bounding box perfect: obiectul va fi pus în inventar și volumul va fi calculat corect.

### Propunere Metrica de Business: VWAE
Metrica reală care ne interesează este "cu câți metri cubi greșim cotația de mutare pe fiecare cameră?".
Am definit **VWAE (Volume-Weighted Absolute Error)**, calculată astfel:
`VWAE = SUM( |Pred_Qty - True_Qty| * Volume_M3 )` pe toate clasele de obiecte masive.

O ratare a unui pat (2.2 m³) creează o penalizare de 2.2 la scor. Ratarea unui TV (0.15 m³) creează o penalizare de doar 0.15. Această asimetrie reflectă impactul direct în business: o eroare mare duce la o dubă prea mică (pierdem bani/timp) sau prea mare (pierdem clientul din cauza prețului).

## 2. Evaluation Harness
Pentru a măsura această metrică practic, am construit un "evaluation harness" (`part-a/eval.py`) peste care am rulat modelul `YOLOv8n` (un model baseline off-the-shelf, pre-antrenat pe dataset-ul COCO). 

### Setup-ul:
- Am preluat **10 imagini de test** ("held-out set") din directorul `Images/Living Room`.
- Am făcut un mapping de clase (ex: COCO `couch` -> MOVIN `sofa`).
- Am folosit dicționarul de volume creat la exercițiul B2.
- Am generat adnotările corecte (`ground_truth.json`).

## 3. Rezultatele Baseline și Analiza de Erori

### Tabel de Rezultate
| Imagine | VWAE (m³) | Detalii Eroare (Față de Ground Truth) |
| :--- | :--- | :--- |
| 10.jpg | 0.00 | Perfect |
| 1000.jpg | 0.00 | Perfect |
| 1005.jpg | 0.70 | `armchair`: +1 (Hallucination) |
| 1006.jpg | 1.05 | `coffee_table`: -1 (Missed); `armchair`: +1 (Hallucination) |
| 1007.jpg | 0.00 | Perfect |
| 1008.jpg | 0.70 | `armchair`: +1 (Hallucination) |
| 1012.jpg | 0.15 | `tv`: -1 (Missed) |
| 1022.jpg | 0.00 | Perfect |
| 1025.jpg | 0.15 | `tv`: +1 (Hallucination) |
| 1027.jpg | 5.00 | `armchair`: -2 (Missed); `sofa`: +2 (Hallucination) |

**TOTAL VWAE (Baseline): 7.75 m³ la 10 poze** (media ~0.77 m³ eroare per imagine).

### Categorisirea Erorilor (Error Analysis)
Am identificat 3 tipuri majore de erori în comportamentul YOLOv8 pe datele noastre:

1. **Class Confusions (Cea mai periculoasă)**:
   - *Exemplu*: În poza `1027.jpg`, modelul a confundat 2 fotolii masive ("armchairs") ca fiind 2 canapele ("sofas"). 
   - *Impact*: Deși vizual seamănă, diferența de volum e imensă. 2x Sofa = 3.6m³ estimat de sistem, față de realitatea 2x Armchair = 1.4m³. Eroare netă de 5.0m³. Clientul primește o cotație colosal de scumpă și pleacă.

2. **False Positives / Hallucinations (Eroare Frecventă)**:
   - *Exemplu*: În `1005.jpg` și `1008.jpg`, modelul vede "armchairs" în reflexii sau cute de draperii.
   - *Impact*: Mărește volumul cu 0.7 m³. În general suportabil, dar enervant pentru client când trebuie să bifeze că "nu există".

3. **False Negatives / Missed Objects**:
   - *Exemplu*: În `1012.jpg` a ratat un TV plat (-0.15 m³), iar în `1006.jpg` o măsuță de cafea (-0.35 m³).
   - *Impact*: Ne expunem riscului să trimitem o dubă insuficient de încăpătoare dacă obiectele ratate sunt mari.

## 4. Recomandări de Fix-uri (Ranked)

Ce aș repara prima dată (în ordine ROI - Effort/Impact):

1. **Re-antrenarea modelului (Finetuning) pe diferențierea Sofa vs Armchair** (Impact Maxim, Efort Mediu)
   - *De ce*: Confuzia dintre clase aduce erori de calcul uriașe (cum am văzut la `1027.jpg`).
   - *Cum*: Adăugarea de negative mining în dataset pentru fotolii voluminoase și canapele mici.
2. **Scăderea/Ajustarea Threshold-ului asimetric** (Impact Mare, Efort Foarte Mic)
   - *De ce*: E mai ieftin să prezentăm clientului "1 TV în plus" (clientul îl șterge din UI-ul de la taskul B3) decât să-l ratăm total și echipa de la dubă să nu aibă spațiu.
   - *Cum*: Putem configura modelul să aibă threshold mai mic (ex: 0.3) pentru paturi/dulapuri, și threshold normal (0.5) pentru tv/scaune. Astfel preferăm să fim "siguri că nu ratăm patul".
3. **Validare spațială (NMS pe 3D/IoU inter-poză - vezi B2)** (Impact Mediu, Efort Mare)
   - *De ce*: Multe halucinații apar dacă fotoliul e tăiat la jumătate în colțul pozei.
   - *Cum*: Creșterea complexității la deduplicare inter-poze (deja făcut parțial la provocarea B2).

## Răspunsuri extra cerute

* *Missing a wardrobe means we under-quote... How does that asymmetry set your confidence threshold?*
  Din cauza acestei asimetrii (un over-quote mic e acceptabil din UI, un under-quote pe obiect masiv creează pierderi logistice masive), confidence threshold-ul nu ar trebui să fie global! Aș impune un prag de 0.3-0.4 pentru "Wardrobe" și "Bed" (riscăm o mică halucinație, dar clientul o șterge din UI) și un prag strict de 0.7-0.8 pentru obiectele foarte dese care creează "zgomot" (Dining chairs, Nighstands).

* *We have 5 photos of the same living room... How does your evaluation handle that?*
  Harness-ul prezent aici este "per-imagine". În sistemul de producție complet, modulul din B2 se așează ca layer peste aceste 5 poze și face clustering/deduplicare (IoU/Track-ID). Pentru un eval real E2E, aș compara Output-ul agregate din B2 cu un Ground Truth "al camerei", nu "al pozei", exact cum sugerează și provocarea. Evaluarea per-cameră este singura validă financiar.
