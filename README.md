# Qmetify

Ingyenes, böngészőben futó eszköz Q-módszertani felmérések tervezéséhez és kitöltéséhez. A kitöltés két fordulóból áll: előválogatás három kupacba, majd rendezés kvázi-normális eloszlású rácsra. A válaszok a kutató Google-táblázatába érkeznek.

Élő cím: **https://qmetify.github.io/** (tervező: `https://qmetify.github.io/#tervezo`)

Licenc: MIT. Szerző: Csonka Arnold.

## Fájlok

| Fájl | Szerepe |
|---|---|
| `index.html` | A teljes alkalmazás (tervező és kitöltő felület), egyetlen fájlban |
| `Code.gs` | Google Apps Script végpont, amely a válaszokat a táblázatba írja |

## 1. Google-táblázat beállítása (egyszer)

Számítógépen végezd, telefonon és tableten az Apps Script szerkesztő nem érhető el. A részletes, kattintásonkénti útmutató a tervező Ellenőrzés és megosztás fülén is megtalálható.

1. Hozz létre egy új Google-táblázatot.
2. Bővítmények, Apps Script. Töröld a mintakódot, illeszd be a `Code.gs` tartalmát, és mentsd.
3. Bevezetés, Új telepítés, típus: Webalkalmazás. Végrehajtás: *Én*. Hozzáférés: *Bárki*. Engedélyezd a kért jogosultságokat.
4. A kapott `/exec` végű címet másold a tervező Alapadatok fülén a Beküldési cím mezőbe, és nyomd meg a Kapcsolat tesztelése gombot.

**Kódfrissítés:** Bevezetés, Telepítések kezelése, ceruza, Verzió: Új verzió. Így a cím nem változik. Az "Új telepítés" új címet adna.

## 2. Felmérés tervezése

A tervező a kezdő képernyővel indul: terv betöltése fájlból, folytatás a böngészőben mentett tervvel, új üres felmérés vagy mintafelmérés.

Fülek: Alapadatok (azonosító, nyelvek, beküldési cím, véletlen sorrend), Szövegek (kitöltési utasítás, bevezető, adatkezelési tájékoztató hosszú vagy rövid javaslattal, kupacnevek, köszönet), Állítások (egyenként vagy tömeges beillesztéssel), Rács, Utólagos kérdések (szöveg, szám, lista, többszörös választás "Egyéb" opcióval), Ellenőrzés és megosztás.

**Fontos:** a tervet a felső sáv "Mentés fájlba" gombjával mentsd el minden munkamenet végén. A böngészős mentés csak azon a gépen és böngészőben van meg.

## 3. Megosztás

Az Ellenőrzés és megosztás fülön a "Link készítése" gomb a teljes felmérést a linkbe csomagolja. A link hosszú, ezért a TinyURL gombbal érdemes lerövidíteni. 8000 karakter fölött az eszköz figyelmeztet; ilyenkor a második nyelv kikapcsolása vagy rövidebb szövegek segítenek.

Élesítés után csak szöveget javíts. Ha az állítások azonosítóit vagy a rácsot módosítod, a félbehagyott kitöltések újraindulnak.

## 4. A kitöltő útja

1. Bevezető és hozzájárulás.
2. Rövid tájékoztató a menetről és a rács alakjáról.
3. Előválogatás: egyenként megjelenő állítások, három gomb vagy az 1, 2, 3 billentyű.
4. Rendezés: az állítások egyenként érkeznek (előbb az egyetértők, aztán az egyet nem értők, végül a semlegesek), kattintással vagy húzással kerülnek a rácsra. Előző/Következő, Visszavonás, Rendezés újrakezdése, kártyák cseréje. Laptopon és tableten a teljes rács görgetés nélkül kifér.
5. A szélső oszlopok indoklása, utólagos kérdések, beküldés.

A félbehagyott kitöltés az eszközön megmarad. Ha a beküldés nem sikerül, a résztvevő fájlként letöltheti a válaszait.

## 5. Adatok

Felmérésenként három lap készül, a nevükben a felmérés azonosítójával:

- **`<id> · Q-sorts`**: sorok = állítások, oszlopok = válaszadók (`P001_xxxxxx`), első oszlop `statement_id`, utolsó `statement_text`.
- **`<id> · Comments`**: egy sor egy indoklás (válaszadó, állítás, pontszám, szöveg, komment).
- **`<id> · Background`**: egy sor egy válaszadó: kitöltési idők, nyelv, lépésszám, utólagos kérdések (`q_<azonosító>`; többszörös választásnál pontosvesszővel elválasztva).

A `_raw` lapon minden beküldés teljes JSON formában is megmarad (az előválogatás kupacaival együtt).

Elemzés R-ben (a Q-sorts lapot CSV-ként letöltve):

```r
library(qmethod)
d <- read.csv("teszt-regen - Q-sorts.csv", row.names = 1, check.names = FALSE)
d <- d[, names(d) != "statement_text"]
res <- qmethod(d, nfactors = 3, rotation = "varimax", forced = TRUE)
summary(res)
```

Stata `qfactor`: az elrendezés megfelel (minden Q-sort egy változó, az állítások a megfigyelések). Az esetleges további elvárásokat (állítás-sorszám, szövegváltozó) az első adatokkal érdemes kipróbálni.

## Adatvédelem

A válaszok a beküldési címhez tartozó Google-táblázatba kerülnek, az eszköz máshol nem tárol semmit. A résztvevő azonosítója véletlenszerű; nevet és e-mail-címet csak akkor rögzít, ha egy utólagos kérdés rákérdez. A nyers JSON a böngésző típusát (`userAgent`) is tartalmazza, ezt érdemes a tájékoztatóban megemlíteni. A beépített GDPR-szöveg általános javaslat, nem jogi tanács; a szögletes zárójeles részeket ki kell tölteni, és az intézmény adatvédelmi tisztviselőjével egyeztetni.
