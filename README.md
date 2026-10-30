<!--
author:   MINT-the-GAP, Martin Lommatzsch, Jihad Hyadi
version:  1.0.4
language: en
edit: true
narrator: US English Female
comment:  DynFlex - Dynamic, resizable flex containers for LiaScript with interactive quiz elements

script:   ./dist/index.js

-->

# DynFlex

          --{{0}}--
DynFlex provides dynamic, resizable flex containers for LiaScript courses. It allows you to create flexible layouts with drag-to-resize functionality, automatic theme integration, and support for interactive quiz elements with multiple check buttons per container.

__Try it on LiaScript:__
https://liascript.github.io/course/?https://raw.githubusercontent.com/MINT-the-GAP/lia-DynFlex/main/README.md

__See the project on GitHub:__
https://github.com/MINT-the-GAP/lia-DynFlex

           {{1}}
1. Load the macros via

   `import: https://raw.githubusercontent.com/MINT-the-GAP/lia-DynFlex/main/README.md`

   or pin to a specific version:

   `import: https://raw.githubusercontent.com/MINT-the-GAP/lia-DynFlex/1.0.4/README.md`

2. Copy the definitions into your project

3. Clone this repository on GitHub

## Basic Example

          --{{0}}--
Create a basic flex container with resizable children. Simply add the `dynFlex` class to a section or div, and `flex-child` to each child element.

```markdown
<section class="dynFlex">

<div class="flex-child">

Content A

</div>

<div class="flex-child">

Content B

</div>

<div class="flex-child">

Content C

</div>

</section>
```

---

<section class="dynFlex">

<div class="flex-child">

**Content A**

Lorem ipsum dolor sit amet, consectetur adipiscing elit.

</div>

<div class="flex-child">

**Content B**

Sed do eiusmod tempor incididunt ut labore et dolore.

</div>

<div class="flex-child">

**Content C**

Magna aliqua ut enim ad minim veniam.

</div>

<div class="flex-child">

Content C

</div>

<div class="flex-child">

Content C

</div>

<div class="flex-child">

Content C

</div>

</section>

## Interactive Quiz Example

          --{{0}}--
DynFlex automatically handles LiaScript quiz elements. When you separate quiz items with blank lines, each gets its own check button. This is perfect for creating multi-column quiz layouts.

```markdown
<section class="dynFlex">

<div class="flex-child">

__$a)\;\;$__ 1? [[ 1 ]]


__$b)\;\;$__ 4? [[ 4 ]]



__$c)\;\;$__ 5? [[ 5 ]]

</div>

<div class="flex-child">

__$d)\;\;$__ 2? [[ 2 ]]

</div>

<div class="flex-child">

__$e)\;\;$__ 3? [[ 3 ]]

</div>

</section>
```

---

<section class="dynFlex">

<div class="flex-child">

__$a)\;\;$__ 1? [[ 1 ]]


__$b)\;\;$__ 4? [[ 4 ]]



__$c)\;\;$__ 5? [[ 5 ]]

</div>

<div class="flex-child">

__$d)\;\;$__ 2? [[ 2 ]]

</div>

<div class="flex-child">

__$e)\;\;$__ 3? [[ 3 ]]

</div>

</section>

## Configuration

          --{{0}}--
DynFlex supports layout defaults on the container and an optional initial-width override on individual children.

### Container attributes

- `data-gap`: Gap between flex items in pixels, for example `30` or `30px` (default: `20px`).
- `data-hit`: Width of the resize handle hit area in pixels, for example `28` or `28px` (default: `22px`).
- `data-columns`: Initial number of equally wide items per row, for example `2` or `5` (default: `3`). Use a positive whole number. If there are fewer children, they fill one row. Gaps are included in the calculation.
- `data-basis`: Explicit initial width for each item as a percentage of the container width, for example `40` or `40%`. Without this attribute, `data-columns` determines the initial layout. Gaps take additional space, so `data-basis="50"` with a positive gap does not fit two items in one row; use `data-columns="2"` for that.
- `data-widths`: Individual initial percentages in child order, for example `50,30,20` or `50%, 30%, 20%`. Supply one positive percentage per child, adding up to 100. DynFlex subtracts the gaps first and distributes the remaining space, so all children fit in one row. Invalid lists fall back to `data-basis` or `data-columns`.
- `data-min`: Minimum width while dragging, as a percentage of the container width (default: `10%`).
- `data-max`: Maximum width while dragging, as a percentage of the container width (default: `100%`).
- `data-store`: Storage key for persisting user-adjusted widths in the browser's localStorage. Widths are saved when a handle is dragged and restored on subsequent visits.

For the initial layout, a child's `data-start-width` takes priority over the
container's `data-widths`, followed by an explicit `data-basis`, then
`data-columns`. Existing inline `--w`
widths, dragged widths, and restored widths take priority over these initial
settings. Inline `--w` widths prevent restoring a saved layout. The drag limits
`data-min` and `data-max` do not restrict the initial layout.

To try new initial settings after saving a layout, use a new `data-store` value
or remove its localStorage entry, named `dynFlexWidths::<your-key>`, then reload
the page. Narrow containers and small screens display one column regardless of these settings;
see the narrow-layout explanation below. Very small shares or very high column
counts can still wrap if the cards' padding no longer fits into the assigned
widths.

### Child attribute

- `data-start-width`: Initial width of this `.flex-child` as a percentage of the container width, for example `50` or `50%`. Use a positive value up to 100. Put this attribute on the child itself, including when LiaScript adds a wrapper around it. Other children retain the container defaults; remaining space is not redistributed. Invalid values fall back to the container defaults.

### Example with Custom Configuration

```markdown
<section class="dynFlex" data-gap="30" data-columns="3" data-store="my-layout">

<div class="flex-child">

Item 1

</div>

<div class="flex-child">

Item 2

</div>

<div class="flex-child">

Item 3

</div>

</section>
```

---

<section class="dynFlex" data-gap="30" data-columns="3" data-store="demo-layout">

<div class="flex-child">

**Item 1** - This layout starts with three equal columns and a 30px gap

</div>

<div class="flex-child">

**Item 2** - Widths are persisted in localStorage

</div>

<div class="flex-child">

**Item 3** - Try resizing and refreshing the page!

</div>

</section>

## Choose the Initial Column Count

Use `data-columns="2"` for two equal columns. Additional children continue on
the next row at the same width. Without an explicit setting, DynFlex starts
with up to three columns.

```markdown
<section class="dynFlex" data-columns="2">

<div class="flex-child">

Item 1

</div>

<div class="flex-child">

Item 2

</div>

<div class="flex-child">

Item 3

</div>

</section>
```

---

<section class="dynFlex" data-columns="2">

<div class="flex-child">

**Item 1** - First column

</div>

<div class="flex-child">

**Item 2** - Second column

</div>

<div class="flex-child">

**Item 3** - Next row

</div>

</section>

### Five columns

The same setting accepts other counts, such as `data-columns="5"`:

```markdown
<section class="dynFlex" data-columns="5">

<div class="flex-child">

Item 1

</div>

<div class="flex-child">

Item 2

</div>

<div class="flex-child">

Item 3

</div>

<div class="flex-child">

Item 4

</div>

<div class="flex-child">

Item 5

</div>

</section>
```

---

<section class="dynFlex" data-columns="5">

<div class="flex-child">

**1**

</div>

<div class="flex-child">

**2**

</div>

<div class="flex-child">

**3**

</div>

<div class="flex-child">

**4**

</div>

<div class="flex-child">

**5**

</div>

</section>

## Individual Initial Widths

To give child 1 half of the available space, child 2 thirty percent, and
child 3 twenty percent, set `data-widths="50,30,20"` on the container:

```markdown
<section class="dynFlex" data-widths="50,30,20">

<div class="flex-child">

Child 1: 50%

</div>

<div class="flex-child">

Child 2: 30%

</div>

<div class="flex-child">

Child 3: 20%

</div>

</section>
```

---

<section class="dynFlex" data-widths="50,30,20">

<div class="flex-child">

**Child 1: 50%**

Half of the space remaining after subtracting the gaps.

</div>

<div class="flex-child">

**Child 2: 30%**

Thirty percent of that space.

</div>

<div class="flex-child">

**Child 3: 20%**

Twenty percent of that space.

</div>

</section>

With a 1000px container and the default 20px gap, the two gaps leave 960px
for the children. Their widths are 480px, 288px, and 192px. These are starting
widths; each child can still be resized with its handle.

## Override One Child's Initial Width

Set `data-start-width` on just the child that needs a different starting width.
Here the middle child starts at 20% of the container width; its neighbours keep
the normal three-column width. No width list is needed for the other children.

```markdown
<section class="dynFlex" data-columns="3">

<div class="flex-child">

Normal width

</div>

<div class="flex-child" data-start-width="20%">

Starts at 20%

</div>

<div class="flex-child">

Normal width

</div>

</section>
```

---

<section class="dynFlex" data-columns="3">

<div class="flex-child">

**Normal width**

</div>

<div class="flex-child" data-start-width="20%">

**Starts at 20%**

</div>

<div class="flex-child">

**Normal width**

</div>

</section>

The unused space stays free. Wider children wrap normally when the widths plus
gaps no longer fit; `data-start-width="100%"` gives one child a full row. Saved
or manually resized widths still take priority, and narrow layouts still show
one column. All children remain resizable.

## Features

          --{{0}}--
DynFlex includes several powerful features out of the box.

- **Drag-to-resize** - Drag a card's visible resize rail anywhere along its full current height. The rail follows later content and animation height changes. It is pointer-transparent, so buttons, quiz fields, links, and other interactive content win hit-testing; non-interactive rail areas remain draggable by mouse and touch.
- **Paint-safe updates** - Newly inserted containers, flex children, and replaced LiaScript wrappers are reconciled before the browser's next paint, without duplicate resizers or listeners.
- **Responsive website embeds** - Generic `??[Title](URL)` iframe fallbacks inside cards follow the actual card width, including slide changes, delayed loading, and dragging, without reloading the embedded website. Explicit heights and provider-specific embeds retain their sizing.
- **Persistent widths** - Optionally save user-adjusted widths to localStorage
- **Theme integration** - Automatically adapts to LiaScript theme colors
- **Responsive** - Automatically switches to one column below 421px viewport width or 600px container width
- **Quiz support** - Handles LiaScript input fields with automatic block separation
- **Wrapper-robust** - Works even when LiaScript wraps your elements
- **Multiple check buttons** - Separate quiz items with blank lines for individual check buttons

### Narrow layouts and saved widths

At viewport widths of 420px or less, or when a DynFlex container is 599px or
narrower (for example with an open table of contents), every card fills its
container and resize handles are hidden. This also applies to explicit `--w`
widths, widths changed with a handle, and widths restored with `data-store`.
The narrow layout only overrides the displayed size: it does not delete or
overwrite those widths or localStorage. When both viewport and container are
wider, the previous widths apply again. On a first visit, the configured
`data-columns`, `data-basis`, or `data-widths` layout and any child-specific
`data-start-width` values also resume when widened.
Without explicit settings, the automatic distribution uses up to three columns.

### Website embed heights

No extra height annotation is needed for a website embedded in a `.flex-child`:

```markdown
??[Wochenaufgaben](https://wochenaufgaben.gsg-freiberg.de)
```

DynFlex corrects LiaScript's initial height measurement once the card layout is
ready and follows later width changes. This sizes the iframe viewport; it does
not measure the contents of a cross-origin website. To choose a height yourself,
use an explicit annotation, which DynFlex preserves:

```markdown
??[Wochenaufgaben](https://wochenaufgaben.gsg-freiberg.de) <!-- style="height:80vh;" -->
```

The compatibility adapter supports LiaScript's current closed-shadow `div_`
wrapper and open shadow roots. Unknown component internals are left untouched.

## Implementation

          --{{0}}--
If you prefer not to use `import:`, copy the following block directly into
the header of your LiaScript document.

```markdown
script:   https://cdn.jsdelivr.net/gh/MINT-the-GAP/lia-DynFlex@1.0.4/dist/index.js
```
