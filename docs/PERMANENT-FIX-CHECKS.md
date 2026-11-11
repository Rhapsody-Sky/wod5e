# Prüfstand: dauerhafte Fork-Korrektur

Stand: 11. November 2026. Release `5.3.28-gods.1`, Paket-ID `wod5e-gods`.
Arbeitszweig: `codex/fork-identity-upstream-5.3.28`.

## Quellen und Umfang

- Basis: veröffentlichtes `5.3.27-gods.7` (`56b6a289`).
- Offizieller veröffentlichter Stand: `upstream/main`, Commit
  `00adb9ce74cda5fcf3b2eb889a5dabba0f316b88` / `5.3.28`.
- Hotbar-Makro-Fix und Kompendien-Schreibschutz übernommen; `upstream/dev` nicht.
- Eigene Paket-ID, Update-URLs, Maintainer-Angabe und Setup-Grafik; originale
  Autoren und Lizenz erhalten. `WOD5E.api`, CSS und Übersetzungsschlüssel bleiben.
- Migration von Einstellungen, Flags, Paketpfaden und eigenen Kompendien-Verweisen;
  alte Daten bleiben erhalten. Keine automatische Änderung gesperrter oder fremder Packs.
- Götterbogen: Macht links, Kraft rechts, Erkenntnis unten. Attributwerte und
  Würfelpfade bleiben mit denselben Attribut-IDs verknüpft.
- `.8`/`.9`-Featurearbeit bleibt im bisherigen Arbeitszweig und ist hier nicht enthalten.
- Die Veröffentlichung im GitHub-Fork nimmt keine produktive Weltumstellung vor.

## Ausgeführte lokale Prüfungen

Node.js `24.12.0`, Windows. Alle folgenden Prüfungen bestanden:

- `npm run test:run`: **78 Tests in 7 Dateien**, einschließlich der gerenderten
  Attributreihenfolge, Eingabewerte und Würfelpfade.
- ESLint: keine Fehler oder Warnungen.
- Alle Handlebars-Templates lassen sich kompilieren.
- Einstellungs- und Flag-Priorität: neue explizite Werte gewinnen, einschließlich
  `false`, `0` und leere Listen. Gelöschte neue Flags werden nicht wiederbelebt.
- Migration: nur ein aktiver GM schreibt, Schreibzugriffe werden abgewartet,
  Abschlussmarker bleiben bei Fehlern unverändert, Wiederholung ist möglich.
- Automations-Callbacks erzeugen während der Übernahme keine verspäteten
  Schreibzugriffe auf die wiederhergestellten Einzeloptionen.
- Embedded-Daten: Root-Updates ersetzen keine Item-/Token-Sammlungen; IDs,
  Attribute, Gesundheit, Besitzrechte und historische `_stats` bleiben erhalten.
- Offline-Werkzeug: Vorschau ohne Schreibzugriff, sichere Weltpfade,
  Modulhinweise sowie vollständige Archivabdeckung geprüft. Die Linux-Anwendung
  verlangt zusätzlich einen Inhalts-/Metadatenvergleich mit GNU `tar`.
- `npm run normalize-upstream`: keine weiteren Namespace-Anpassungen nötig.
- `npm run verify-release`: eigene Identität, Update-Ziele, benötigte Dateien,
  relative JavaScript-Imports und Ressourcen in mitgelieferten Packs vorhanden.
- Styles reproduzierbar: SHA256
  `56db2f9fce220c0d5ec528f65f995585af79f68adbc0aaff6774998d9adf22f9`.
- Bestandsvergleich gegen `.7`: 5 Makro- und 2 Conditions-IDs unverändert;
  Pack-Daten nur gezielt an Namespace/Pfade angepasst. Alle 11 vorhandenen
  Göttersymbol-/Würfelgrafikdateien sind byte-identisch.
- `git diff --check`: bestanden; keine offenen Merge-Konflikte.

Der ZIP-Builder prüft vor dem Bauen. Die Release-Automation prüft zusätzlich das
entpackte ZIP und die Übereinstimmung von Tag und Manifest. Sie lädt ausschließlich
in den Fork hoch und ruft keine offizielle Foundry-Paketveröffentlichung auf.

## Noch keine produktive Freigabe

Das Release wurde nicht in einer gestarteten Foundry-Welt getestet. Vor einer
produktiven Umstellung müssen die echten Welt-/Token-Daten und verwendeten Module
an einer isolierten Weltkopie geprüft werden. Die `verified: 14.368`-Angabe ist aus
dem offiziellen Manifest übernommen; sie ist kein eigener Laufzeittest des Forks.
Die produktive Instanz bleibt durch das Release unverändert.
Vorgehen, Backup und Rückweg: [FORK-MIGRATION.md](FORK-MIGRATION.md).

`npm audit` meldete am 30. September 2026 19 Warnungen im Entwicklungs-/Build-Abhängigkeitsbaum
(2 niedrig, 3 mittel, 13 hoch, 1 kritisch). Dieser Baum und `node_modules` werden
nicht in das Foundry-ZIP aufgenommen. Kein pauschales Dependency-Upgrade durchgeführt;
Entwicklungsserver/Test-UI nicht öffentlich betreiben. Das zusätzliche Handlebars
für Template-Tests ist auf `4.7.9` gesetzt. Dies ist keine Sicherheitsfreigabe aller
upstreamseitigen Bibliotheken.

## Lokaler Folgekandidat `5.3.28-gods.2`

- `.8`: Item-Modifikatoren am Actor vorbereitet, verlässliche
  Beschreibungsaufbereitung, Blutwallungs- und Neuwurf-Fixes. Die aktuelle
  Paket- und Migrationsprüfung ersetzt die frühere `.8`-Release-Infrastruktur.
- `.9`: direkte Paarwahl und eigener Einzelwurfknopf auf den Attributkarten,
  göttliche Würfelpools im Würfelmenü, Chat-Wurfdetails und Neuwurf-Aktionen.
  Die Attributanordnung aus `.1` bleibt im Bogen und in den Auswahllisten erhalten.
- Die Paket-ID `wod5e-gods` und beide Migrationsmarker bleiben gleich. Der Test
  für die Aktualisierung einer bereits konvertierten `.1`-Welt schreibt nur
  den Release-Versionsmarker, keine Actor-Daten.
- 124 Tests in 17 Dateien, ESLint, reproduzierbarer LESS-Build,
  Namespace- und Paketprüfung bestanden. Dazu zählen die gerenderte
  Kartenreihenfolge, gespeicherte Würfe mit alter Flag-ID und private Chat-Ergebnisse.

Der Folgekandidat ist nicht veröffentlicht und wurde nicht in einer laufenden
Foundry-Welt getestet. Vor produktiven Änderungen weiterhin eine isolierte
Weltkopie verwenden. Die produktive Instanz wurde nicht verändert.
