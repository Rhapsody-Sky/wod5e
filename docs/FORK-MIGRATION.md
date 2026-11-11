# Dauerhafte Fork-Identität und Umstellung

## Stand der Version

`5.3.28-gods.1` basiert auf dem veröffentlichten Gods `.7` und dem
offiziellen `main` bis `00adb9ce` / `5.3.28`. Enthalten sind der Hotbar-Makro-Fix,
der Kompendien-Schreibschutz aus `5.3.27` und die eigene Paket-Identität.
Im Götterbogen stehen Macht links, Kraft rechts und Erkenntnis unten mittig.
Die vorbereiteten `.8`/`.9`-Bedienungs- und Würfelverbesserungen sind nicht enthalten.
Die Trennung von Daten-Schema und Release-Version ist notwendiger Migrationsschutz.

Der neue Paketordner und die neue Paket-ID heißen `wod5e-gods`. `WOD5E.api`,
Übersetzungsschlüssel und CSS-Klassen bleiben absichtlich kompatibel. Der Fork
bleibt ein GPL-Fork des offiziellen Systems; Upstream-Credits bleiben erhalten.

Eine eigene Manifest-URL bei gleicher Paket-ID war nicht ausreichend: Foundry 14
kann beim Update auch den offiziellen Paketindex berücksichtigen. Die separate
ID verhindert die Verwechslung. `protected: true` ist KEINE Update-Sperre.

## Vor der produktiven Migration

1. Geprüftes Release verwenden. Nicht direkt eine laufende
   Installation per `git pull` überschreiben.
2. Neues Paket zusätzlich unter `Data/systems/wod5e-gods` installieren. Den alten
   `wod5e`-Ordner und seine native `wod5e.lock` behalten. Keinen Ordner bloß umbenennen.
3. Foundry stoppen und eine vollständige Sicherung der Welt außerhalb des Weltordners
   erstellen. Archiv mit `tar -tzf` prüfen. Alle Spieler bleiben bis zum Abschluss draußen.
4. Erst an einer isolierten Kopie der Welt testen: Götter/Vampire öffnen, ein/zwei
   Attribute rollen, Hunger-/Desperations-/Rage-Würfel, alte Chatwürfe, Makros, eigene
   Attribute/Disziplinen, Ausrüstung, Szenen und unverbundene Tokens kontrollieren.
5. Module prüfen: Module mit `relationships.systems` nur für `wod5e`, oder hart
   codierten ID-Abfragen in ihrem JavaScript, brauchen ggf. Unterstützung für die
   neue ID. Weder eine ID vortäuschen noch ungefragt Drittanbieter-Module ändern.

## Descriptor-Werkzeug

Das Werkzeug läuft mit Node.js und macht standardmäßig nur eine Vorschau:

```sh
node /PFAD/Data/systems/wod5e-gods/system/scripts/maintenance/migrate-fork-world.js \
  --data-path /PFAD \
  --world beispiel-welt
```

Es zeigt installierte Module mit einer abweichenden System-Beziehung. Das sind
Hinweise auf installierte Module, nicht die Behauptung, dass alle aktiv sind.
Erst nach Prüfung der Modulliste, erfolgreichem Test der Weltkopie und Backup:

```sh
node /PFAD/Data/systems/wod5e-gods/system/scripts/maintenance/migrate-fork-world.js \
  --data-path /PFAD \
  --world beispiel-welt \
  --apply \
  --backup /BACKUP/beispiel-welt.tar.gz
```

Bei Modulhinweisen ist zusätzlich `--acknowledge-module-warnings` erforderlich.
`/PFAD`, `/BACKUP` und `beispiel-welt` durch die lokalen Pfade und die Welt-ID ersetzen.
Das Werkzeug mit dem Foundry-Dienstkonto ausführen. Es stoppt/startet
keine Dienste und schreibt nicht in Datenbanken. Es verweigert die Anwendung
bei laufendem Foundry, falschem System, unpassendem Backup oder fremdem Weltpfad.
Vor dem Schreiben werden das installierte Paket, die vollständige Dateiabdeckung
des Archivs und dessen Inhalte/Metadaten mit GNU `tar --compare` geprüft. Deshalb
ein frisches Backup der gestoppten Welt verwenden, nicht nur eine alte `world.json`.
Die alte `world.json` wird zusätzlich separat erhalten; `systemVersion`, IDs,
Core-Version und Spielzeitstempel werden nicht vorgetäuscht oder zurückgesetzt.

## Erster Start unter der neuen ID

Nur als GM starten und die Konsole beobachten. Der aktive GM kopiert registrierte
Welteinstellungen und Dokument-Flags; alte Schlüssel bleiben vorhanden. Neue,
explizite Werte haben Vorrang, auch `false`, `0` und leere Listen. Pro Browser
werden die bisherigen Client-Einstellungen übernommen. Gelesen werden sie schon
während der Initialisierung, bevor Foundry Welt-Schreibzugriffe erlaubt.

Lokale Paketpfade, enthaltene Makro-/Conditions-UUIDs, gespeicherte Sheet-Klassen,
Chat, Journale, Makros und eingebettete Items/Tokens werden über Foundrys normale
Dokument-APIs angepasst. Native UUID-Weiterleitungen und alte Sheet-Aliase erhalten
Verweise in gesperrten Kompendien. Gesperrte Welt-Kompendien und Drittanbieter-Packs
werden NICHT ungefragt entsperrt oder verändert. Den alten Paketordner behalten,
solange solche Quellen noch alte Bildpfade enthalten. Neue Importe werden angepasst.

Ein Dokument-Marker verhindert, dass später bewusst gelöschte neue Flags aus den
aufbewahrten alten Flags wieder auftauchen. Der Welt-Marker wird erst nach allen
erfolgreichen Schreibzugriffen gesetzt. Bei einem Fehler nicht spielen; Backup
behalten und Ursache prüfen. Ein erneuter Start setzt fehlende Schritte fort.
Modernes 5.x-Datenformat wird nicht erneut durch alte Actor-Konvertierungen geschickt.

## Rückweg

Vor dem ersten Start reicht bei gestopptem Foundry die separat gesicherte alte
`world.json`, zusammen mit dem aufbewahrten `.7`-System. Nach dem ersten Start
unter der neuen ID: vollständiges Welt-Backup und altes System gemeinsam
wiederherstellen; nicht nur die Paket-ID zurückdrehen. Niemals zwei Instanzen auf
dieselben Weltdaten starten. Sicherungen und Quell-/Arbeitsdateien nicht löschen.

## Künftige Upstream-Updates

Der Arbeitszweig des Forks enthält eigene Änderungen; `main` kann ein reiner
Upstream-Spiegel bleiben. In einen separaten Integrationszweig den offiziellen
`upstream/main` mergen, Konflikte bewusst auflösen und `npm run normalize-upstream`
als Prüfung ausführen. Falls nötig mit `-- --write` die schmalen Namespace-Anpassungen
anwenden. Paket-ID, Manifest-/Download-URLs und Autor nicht aus Upstream übernehmen.
`upstream/dev` ist kein veröffentlichter Stand und wird nicht automatisch integriert.

Prüfungen vor jedem Gods-Tag:

```sh
npm ci
npm run test:run
npm run eslint
npm run build:styles
npm run normalize-upstream
npm run verify-release
npm run generate-release
```

Release-Tag und Manifest-Version müssen übereinstimmen. Die Fork-Automation baut
`wod5e-gods.zip`, prüft das entpackte Archiv erneut und lädt ZIP, Manifest und
SHA256SUMS ausschließlich in den GitHub-Fork hoch. Bereits vollständig angehängte
Release-Dateien prüft sie, ohne sie zu ersetzen. Kein API-Aufruf zum offiziellen
Foundry-Paket. Updates des neuen Pakets folgen weiterhin dem Fork-Manifest.
