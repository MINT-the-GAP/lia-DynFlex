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
DynFlex supports several configuration options via data attributes on the container element.

### Attributes

- `data-gap`: Gap between flex items (default: `20px`)
- `data-hit`: Width of the resize handle hit area (default: `22px`)
- `data-basis`: Default width basis for flex items (default: `25%`)
- `data-min`: Minimum width percentage for items (default: `10%`)
- `data-max`: Maximum width percentage for items (default: `100%`)
- `data-store`: Storage key for persisting widths in localStorage

### Example with Custom Configuration

```markdown
<section class="dynFlex" data-gap="30" data-basis="33" data-store="my-layout">

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

<section class="dynFlex" data-gap="30" data-basis="33" data-store="demo-layout">

<div class="flex-child">

**Item 1** - This layout has a 30px gap and 33% default width

</div>

<div class="flex-child">

**Item 2** - Widths are persisted in localStorage

</div>

<div class="flex-child">

**Item 3** - Try resizing and refreshing the page!

</div>

</section>

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
wider, the previous widths apply again. On a first visit, the automatic
distribution of up to three columns also resumes when widened.

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
