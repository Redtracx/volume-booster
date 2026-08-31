# Volume Booster

Eine Firefox-Erweiterung, die die Lautstärke von Audio und Video in einem Tab über
die normalen 100% hinaus verstärkt (bis zu 500%) und einen Lautstärke-Ausgleich
gegen plötzliche Lautstärkesprünge (z. B. beim Streaming) bietet. Alles wird
bequem über ein Toolbar-Popup gesteuert.

## Funktionen

- **Lautstärke-Boost bis 500%** – nützlich bei leisen Videos, Podcasts oder
  Tabs, deren Lautstärke selbst bei 100% zu leise ist.
- **Lautstärke-Ausgleich ("Leveling")** – ein Schalter im Popup schickt das
  Audiosignal durch einen dynamischen Kompressor, der laute und leise
  Passagen angleicht. Praktisch beim Streaming (z. B. Netflix), wenn Dialoge
  leise und Action- oder Werbe-Szenen plötzlich sehr laut sind. Zwei Stufen
  stehen zur Wahl: **Normal** (moderat) und **Stark** (deutlich hörbare
  Angleichung).
- **Presets & Mute** – Schnellzugriff auf 100/200/300/500%, ein Mute-Button
  und ein Reset auf 100%.
- **Pro Website gespeichert** – Lautstärke, Mute-Status und Lautstärke-
  Ausgleich werden für jede Website separat gespeichert und beim nächsten
  Besuch automatisch wieder angewendet.
- **Funktioniert überall** – erkennt `<audio>`- und `<video>`-Elemente auch
  dann, wenn sie erst nach dem Laden der Seite hinzugefügt werden (z. B. bei
  Single-Page-Apps) oder in eingebetteten iFrames liegen.

## Installation

### Temporär laden (Entwicklung / Ausprobieren)

1. Repository herunterladen bzw. klonen.
2. In Firefox zu `about:debugging#/runtime/this-firefox` navigieren.
3. Auf **„Temporäres Add-on laden…“** klicken.
4. Die Datei `manifest.json` aus dem Projektordner auswählen.
5. Das Lautsprecher-Icon erscheint in der Toolbar.

Hinweis: Temporär geladene Add-ons werden beim Neustart von Firefox entfernt
und müssen erneut geladen werden.

### Dauerhafte Installation

Für eine dauerhafte Installation muss die Erweiterung von Mozilla signiert
werden:

1. Erweiterung als ZIP packen, z. B. mit [`web-ext`](https://github.com/mozilla/web-ext):
   ```
   npx web-ext build
   ```
2. Das erzeugte Paket über [addons.mozilla.org](https://addons.mozilla.org/developers/)
   hochladen (als öffentlicher Eintrag oder „Unlisted“ zur Selbstverteilung)
   und signieren lassen.
3. Die signierte `.xpi`-Datei in Firefox öffnen bzw. per Drag & Drop in ein
   Firefox-Fenster ziehen, um sie dauerhaft zu installieren.

## Nutzung

1. Auf einer Seite mit Audio oder Video auf das Lautsprecher-Icon in der
   Toolbar klicken.
2. Über den Schieberegler oder die Presets (100/200/300/500%) die Lautstärke
   einstellen.
3. Optional den **Lautstärke-Ausgleich** aktivieren und die Intensität
   (Normal/Stark) wählen, um Lautstärkeschwankungen zu glätten.
4. Die Einstellung wird für diese Website gespeichert und beim nächsten
   Besuch automatisch übernommen.

## Entwicklung

Die Erweiterung besteht aus reinem HTML/CSS/JavaScript ohne Build-Schritt:

- `manifest.json` – Manifest (WebExtensions, Firefox)
- `content/boost.js` – Content-Script, hängt Audio/Video-Elemente per
  Web Audio API (`GainNode` + `DynamicsCompressorNode`) ein
- `popup/` – Toolbar-Popup (HTML/CSS/JS)

Manifest und Struktur lassen sich mit [`web-ext`](https://github.com/mozilla/web-ext)
prüfen:

```
npx web-ext lint
```

## Einschränkungen

- Auf internen Seiten (`about:`, `addons.mozilla.org`, PDF-Viewer o. Ä.) kann
  keine Content-Script-Injection stattfinden – das Popup zeigt dann einen
  entsprechenden Hinweis.
- Sehr hohe Boost-Werte (z. B. 500%) können bei leisem Ausgangsmaterial zu
  Verzerrungen (Clipping) führen, da echte Lautstärkeverstärkung technisch
  bedingt ist.
