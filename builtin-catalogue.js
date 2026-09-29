// SPDX-License-Identifier: MPL-2.0
/* Canonical built-in action metadata. Runtime handlers reference stable UUIDs. */
const DECKLAB_ACTION_CATALOGUE=[
  {
    "UUID": "com.decklab.visual",
    "Name": "Artwork only",
    "Controllers": [
      "Keypad",
      "Encoder",
      "Neo"
    ],
    "States": [
      {
        "Title": ""
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {},
    "SupportedInMultiActions": false,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "▧"
  },
  {
    "UUID": "com.elgato.streamdeck.system.website",
    "Name": "Website",
    "Controllers": [
      "Keypad"
    ],
    "States": [
      {
        "Title": "Website"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {
      "path": "https://example.com"
    },
    "label": "Website address",
    "field": "path",
    "SupportedInMultiActions": true,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [
      {
        "key": "path",
        "label": "Website address",
        "type": "text"
      }
    ],
    "icon": "◇"
  },
  {
    "UUID": "com.elgato.streamdeck.system.text",
    "Name": "Text",
    "Controllers": [
      "Keypad"
    ],
    "States": [
      {
        "Title": "Text"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {
      "text": "Hello from DeckLab"
    },
    "label": "Text",
    "field": "text",
    "SupportedInMultiActions": true,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [
      {
        "key": "text",
        "label": "Text",
        "type": "text"
      }
    ],
    "icon": "◇"
  },
  {
    "UUID": "com.elgato.streamdeck.system.hotkey",
    "Name": "Hotkey",
    "Controllers": [
      "Keypad",
      "Encoder"
    ],
    "States": [
      {
        "Title": "Hotkey"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {
      "shortcut": "Ctrl+Shift+S"
    },
    "label": "Shortcut (simulation)",
    "field": "shortcut",
    "SupportedInMultiActions": true,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [
      {
        "key": "shortcut",
        "label": "Shortcut (simulation)",
        "type": "text"
      }
    ],
    "icon": "◇"
  },
  {
    "UUID": "com.elgato.streamdeck.system.open",
    "Name": "Open file / application",
    "Controllers": [
      "Keypad"
    ],
    "States": [
      {
        "Title": "Open file / application"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {
      "path": ""
    },
    "label": "File or application path",
    "field": "path",
    "SupportedInMultiActions": true,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [
      {
        "key": "path",
        "label": "File or application path",
        "type": "text"
      }
    ],
    "icon": "◇"
  },
  {
    "UUID": "com.elgato.streamdeck.system.openapp",
    "Name": "Open Application",
    "Controllers": [
      "Keypad"
    ],
    "States": [
      {
        "Title": "Open Application"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {
      "path": ""
    },
    "label": "Application path",
    "field": "path",
    "SupportedInMultiActions": true,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [
      {
        "key": "path",
        "label": "Application path",
        "type": "text"
      }
    ],
    "icon": "◇"
  },
  {
    "UUID": "com.elgato.streamdeck.system.multimedia",
    "Name": "Multimedia",
    "Controllers": [
      "Keypad",
      "Encoder"
    ],
    "States": [
      {
        "Title": "Multimedia"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {
      "command": "playPause"
    },
    "label": "Media command",
    "field": "command",
    "SupportedInMultiActions": true,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [
      {
        "key": "command",
        "label": "Media command",
        "type": "text"
      }
    ],
    "icon": "◇"
  },
  {
    "UUID": "com.elgato.streamdeck.page.next",
    "Name": "Next Page",
    "Controllers": [
      "Keypad"
    ],
    "States": [
      {
        "Title": "Next Page"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {},
    "label": null,
    "field": null,
    "SupportedInMultiActions": false,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "◇"
  },
  {
    "UUID": "com.elgato.streamdeck.page.previous",
    "Name": "Previous Page",
    "Controllers": [
      "Keypad"
    ],
    "States": [
      {
        "Title": "Previous Page"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {},
    "label": null,
    "field": null,
    "SupportedInMultiActions": false,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "◇"
  },
  {
    "UUID": "com.elgato.streamdeck.page.goto",
    "Name": "Go to Page",
    "Controllers": [
      "Keypad"
    ],
    "States": [
      {
        "Title": "Go to Page"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {
      "pageId": ""
    },
    "label": "Destination page",
    "field": "pageId",
    "SupportedInMultiActions": false,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [
      {
        "key": "pageId",
        "label": "Destination page",
        "type": "page"
      }
    ],
    "icon": "◇"
  },
  {
    "UUID": "com.elgato.streamdeck.profile.backtoparent",
    "Name": "Parent Folder",
    "Controllers": [
      "Keypad"
    ],
    "States": [
      {
        "Title": "Parent Folder"
      }
    ],
    "DeckLabBuiltin": true,
    "defaults": {},
    "label": null,
    "field": null,
    "SupportedInMultiActions": false,
    "category": "Built-in actions",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "◇"
  },
  {
    "UUID": "com.decklab.demo.volume",
    "Name": "Volume",
    "Controllers": [
      "Keypad",
      "Encoder",
      "Neo"
    ],
    "States": [
      {
        "Title": ""
      }
    ],
    "DeckLabBuiltin": true,
    "DeckLabDemo": true,
    "SupportedInMultiActions": false,
    "defaults": {
      "value": 68,
      "active": true
    },
    "demo": {
      "id": "volume",
      "colour": "#72dcff",
      "hint": "Rotate to adjust. Press or tap to mute."
    },
    "category": "LCD demos",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "◉"
  },
  {
    "UUID": "com.decklab.demo.brightness",
    "Name": "Brightness",
    "Controllers": [
      "Keypad",
      "Encoder",
      "Neo"
    ],
    "States": [
      {
        "Title": ""
      }
    ],
    "DeckLabBuiltin": true,
    "DeckLabDemo": true,
    "SupportedInMultiActions": false,
    "defaults": {
      "value": 75,
      "active": true
    },
    "demo": {
      "id": "brightness",
      "colour": "#ffd58a",
      "hint": "Rotate to adjust. Press or tap to toggle."
    },
    "category": "LCD demos",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "◉"
  },
  {
    "UUID": "com.decklab.demo.cpu",
    "Name": "CPU monitor",
    "Controllers": [
      "Keypad",
      "Encoder",
      "Neo"
    ],
    "States": [
      {
        "Title": ""
      }
    ],
    "DeckLabBuiltin": true,
    "DeckLabDemo": true,
    "SupportedInMultiActions": false,
    "defaults": {
      "value": 32,
      "active": true
    },
    "demo": {
      "id": "cpu",
      "colour": "#aa9aff",
      "hint": "Sample data. Rotate or tap to change the reading."
    },
    "category": "LCD demos",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "◉"
  },
  {
    "UUID": "com.decklab.demo.memory",
    "Name": "Memory monitor",
    "Controllers": [
      "Keypad",
      "Encoder",
      "Neo"
    ],
    "States": [
      {
        "Title": ""
      }
    ],
    "DeckLabBuiltin": true,
    "DeckLabDemo": true,
    "SupportedInMultiActions": false,
    "defaults": {
      "value": 48,
      "active": true
    },
    "demo": {
      "id": "memory",
      "colour": "#81edba",
      "hint": "Sample data. Rotate or tap to change the reading."
    },
    "category": "LCD demos",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "◉"
  },
  {
    "UUID": "com.decklab.demo.media",
    "Name": "Now playing",
    "Controllers": [
      "Keypad",
      "Encoder",
      "Neo"
    ],
    "States": [
      {
        "Title": ""
      }
    ],
    "DeckLabBuiltin": true,
    "DeckLabDemo": true,
    "SupportedInMultiActions": false,
    "defaults": {
      "value": 0,
      "active": true
    },
    "demo": {
      "id": "media",
      "colour": "#ff9ecd",
      "hint": "Sample track. Rotate to change track; press or tap to play/pause."
    },
    "category": "LCD demos",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "◉"
  },
  {
    "UUID": "com.decklab.demo.counter",
    "Name": "Counter",
    "Controllers": [
      "Keypad",
      "Encoder",
      "Neo"
    ],
    "States": [
      {
        "Title": ""
      }
    ],
    "DeckLabBuiltin": true,
    "DeckLabDemo": true,
    "SupportedInMultiActions": false,
    "defaults": {
      "value": 0,
      "active": true
    },
    "demo": {
      "id": "counter",
      "colour": "#8edee7",
      "hint": "Rotate to count. Press or tap to add one."
    },
    "category": "LCD demos",
    "execution": "local-simulation",
    "configuration": [],
    "icon": "◉"
  }
];
