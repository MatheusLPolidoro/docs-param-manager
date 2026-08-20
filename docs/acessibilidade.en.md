# Accessibility

This page states what this site does for accessibility, how that is sustained,
and **what has not been verified**. The last part is usually the one missing
from statements like this.

## Target

Conformance with **WCAG 2.1 level AA**.

## What is implemented

### Keyboard navigation

- Every feature is reachable by keyboard. There is no focus trap.
- The **skip to content** link is the first item in tab order and becomes
  visible on focus (WCAG 2.4.1).
- The page action buttons — download `.md` and save as PDF — are native
  interactive elements: an `<a>` and a `<button>`. They take focus and respond
  to Enter and Space because the browser does that, not because someone
  programmed it.

### Visible focus

A 3 px focus ring with an offset, applied through `:focus-visible` — meaning it
shows up in keyboard navigation and does not clutter mouse clicks. The colour
changes between the light and dark themes to keep contrast in both
(WCAG 2.4.7 and 1.4.11).

### Motion

**Two things move on this site, and both stop.** The home page wordmark draws
itself once; the terminal blocks type their command once. Beyond that there is
no carousel, autoplay or counter — what remains are hover and focus transitions,
which `prefers-reduced-motion: reduce` disables.

What holds criteria 2.2.2 and 2.3.3 up, point by point:

- **Plays once, not in a loop.** Neither repeats on its own. Repeating is the
  reader's choice, on a button.
- **A visible stop button, always on the page.** Not only on hover: a control
  that requires a mouse does not exist for keyboard navigation.
- **Nothing starts by itself for anyone who asked for less motion.** With
  `prefers-reduced-motion: reduce` the wordmark stays on its still frame and the
  terminal keeps its full text in view. The buttons remain there for anyone who
  wants the animation anyway.
- **The terminal does not type off-screen.** It only starts when the block
  enters the viewport — an animation that finishes before you arrive is not an
  animation, it is content that appeared out of nowhere.
- **Without JavaScript there is no motion at all, and nothing is lost.** The
  terminal is already written out in full in the HTML — the script erases and
  retypes it — and the wordmark shows its finished frame, still.

This fixes, rather than repeats, what the site had inherited from
`param-manager`: there the animation redrew itself **every nine seconds, on
every page**, driven by a timer that never stopped. Continuously moving content
with no way to pause it is exactly what criterion 2.2.2 forbids. The animation
came back; the loop did not.

!!! warning "The CSS media query is not what holds this up"

    `prefers-reduced-motion` lives in `a11y.css` and zeroes the duration of
    every **CSS** animation and transition. The wordmark and the terminal are
    JavaScript timers, which no media query reaches. What holds them is the
    `matchMedia` check inside `assets/js/logo-animation.js` and
    `assets/js/terminal.js`. Removing that check fails the criterion without
    changing a line of CSS — and without anything turning red in the build.

### Typography and font switching

The action bar at the top of every page carries a **text font** selector, next
to the download `.md` and save as PDF buttons. The choice applies to the whole
site and is kept in the browser.

There are four options, and two of them exist for accessibility rather than
taste:

| Option | For what |
|---|---|
| Theme default | Inter for text, JetBrains Mono for code |
| Atkinson Hyperlegible | Designed by the Braille Institute to separate the shapes most easily confused in low vision — `I`/`l`/`1`, `O`/`0` |
| Source Serif 4 | Serif, for anyone who reads long text better with serifs |
| System | The device's native stack, **downloading no web font at all** |

All text on the site is sized in `rem` and `em`, never in pixels: the font size
configured in the browser is honoured, and zooming to 200 % produces no
horizontal scrolling (WCAG 1.4.4 and 1.4.10).

### Contrast

The base palette comes from Material, which already targets AA. The places where
this site's customization introduced risk — figure captions and card
descriptions over coloured backgrounds — have their colour corrected explicitly
for both themes (WCAG 1.4.3).

### Structure and semantics

- One `<h1>` per page, hierarchy without skips.
- Reference tables use real `<th>` cells.
- Every image has `alt`; decorative icons inside buttons are
  `aria-hidden="true"` and `focusable="false"`, so a screen reader announces
  only the text label.
- The action bar is a `role="group"` with an accessible name.
- The terminal blocks leave the accessibility tree while they type and are
  replaced by a transcript of the whole session. A screen reader does not
  follow text assembling itself character by character: it gets the result.
- The document `lang` follows the page language, set by the translation
  mechanism itself (WCAG 3.1.1).

### Reflow and zoom

Wide tables scroll inside their own container, never pushing the page into
horizontal scrolling. Text supports up to 200 % zoom without loss of content
(WCAG 1.4.4 and 1.4.10).

### Touch targets

The action buttons have a 44 px minimum height (WCAG 2.5.5).

### Printing

The print stylesheet — which is what produces the PDF — removes navigation and
controls, raises contrast to black on white, and **reveals the destination of
external links** next to the text. On paper there is no hover, and a link whose
destination is invisible is lost information.

## Two carriers, never colour alone

The site never uses colour as the only carrier of information. Warnings and
alerts carry an icon and a text label in addition to the background colour.

## How this does not get lost

The accessibility rules live in their own file,
`docs/assets/css/a11y.css`, and **each block cites the WCAG criterion it
serves**. The intent is practical: whoever touches the CSS a year from now can
see what they are undoing before they undo it.

## What has not been verified

Being honest about the state of things:

- **No automated accessibility test runs in CI.** There is no axe, no pa11y, no
  Lighthouse in the pipeline. What exists is careful implementation, not
  verification.
- **There has been no testing with a real screen reader** — not NVDA, not JAWS,
  not VoiceOver.
- **Contrast has not been measured with a tool.** Colours were chosen to sit
  above the threshold, but nobody ran a checker over each combination.
- **The diagrams depend on an external CDN.** The theme fetches the diagramming
  library from `unpkg.com` when the page loads. With no internet — or with the
  CDN blocked — the flowcharts simply do not appear, and no visible text
  alternative takes their place. The prose around each diagram describes what it
  shows, which limits the damage without removing it.

- **Two more external dependencies, through the same door as the diagrams.**
  The fonts come from `fonts.googleapis.com`. With no network they do not
  arrive and the text falls back to the system stack, which is degradation
  rather than breakage — and the **System** option in the font selector
  removes the dependency outright, for anyone reading in a closed
  environment.
- **The wordmark animation costs 17 MB.** It is SVG frames generated one by
  one. It is fetched only on the home page, and only when it is going to
  play — never on the other 20 pages — but on a slow connection it is a long
  wait. Anyone who asked for less motion pays none of it: the file is never
  even requested.

None of this invalidates what is implemented. But "follows WCAG AA" is a claim
that needs measurement to become a fact, and that measurement has not happened
yet.

## Reporting a problem

An accessibility barrier is a defect and should be filed as an issue on the
project — describing the assistive technology, the browser, and what should have
happened.
