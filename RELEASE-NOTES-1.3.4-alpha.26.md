# DeckLab 1.3.4 alpha.26 — LCD build controls

The earlier full/segmented display change applied only to artwork. This release connects the regions to Device Studio's build controls and action feedback.

In Build, open **LCD layout, actions & artwork**:
- Select **Segments** or **Full screen / strip** under Build layout.
- Click a region on the device, or choose Selected region.
- Assign an Encoder action with the Action dropdown, or drag an action onto an empty region.
- Use Linked dial to choose the feedback source for a full display, or for a GALLEON region.
- Continue using the existing artwork, transparency and feedback visibility controls.

Stream Deck + has four selectable segments; + XL has six. Their segments remain linked to the matching physical dial. Full mode shows feedback from one selected dial over the full strip; other dial actions remain assigned and usable. Live touch input still routes through the original physical touch zones.

GALLEON has four selectable display regions: 1/2 left, 3/4 right. They link to its two physical Encoder actions (left pair → dial 1 and right pair → dial 2 by default). Linked regions share the action, settings and feedback. These are not four independent SDK action contexts or touchscreen buttons. Full mode displays one linked action across the screen. Region-specific independent actions/stacks are not implemented by this change.

Changing the layout or source retains existing actions and artwork. Display choices are page/device-specific, undoable and included in profile export/import. Build hit targets disappear in Live Preview; the physical dials and touch zones remain interactive.

Validation: browser tests exercised 4/6/4 region counts, selection, action assignment, full-screen source switching, dial feedback, physical touch routing, profile round trips, drag/drop and undo. Existing artwork, studio, encoder, refinement and 1,148 alignment assertions also passed. Screenshot reviewed for GALLEON's four-region Build layout. Physical hardware validation remains outstanding.

Close the previous companion terminal before launching this extracted release. No browser-data clearing is needed.
