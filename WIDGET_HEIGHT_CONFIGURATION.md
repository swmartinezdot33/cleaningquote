# Widget Height Configuration Guide

**Updated**: January 22, 2026  
**Status**: ✅ Complete - Multiple height customization options available

---

## Overview

The cleaning quote widget now supports **three different height configuration methods** to ensure questions always fit properly in your embedded containers. Choose the option that best fits your website's layout.

---

## Quick Start

### Easiest Method: Fixed Height
For most situations, use a single fixed height that works on all devices:

```html
<div id="cleaning-quote-widget"></div>
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="cleaning-quote-widget"
  data-height="1200">
</script>
```

**That's it!** The iframe will be 1200px tall on all devices.

---

## Configuration Options

### Option 1: Fixed Height (Simplest)

Sets the same height for all devices. Best for:
- Small containers (sidebars, popups)
- Consistent layouts
- When you don't need responsiveness

**Attribute**: `data-height="1200"`

**Example - Sidebar Widget (400px wide, 1200px tall)**:
```html
<div id="quote-widget" style="width: 100%; max-width: 400px;"></div>
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="quote-widget"
  data-height="1200">
</script>
```

**Recommended Heights by Container Size**:
- Very narrow (< 400px): 1400-1600px
- Narrow (400-600px): 1200-1300px
- Medium (600-800px): 1000-1100px
- Wide (> 800px): 800-900px

---

### Option 2: Responsive by Device Type (Recommended)

Automatically adjusts height based on device type. Best for:
- Responsive websites
- Layouts that adapt to screen size
- Most use cases

**Attributes**:
- `data-mobile-height="1200"` - Mobile phones (default: 900px)
- `data-tablet-height="1000"` - Tablets (default: 900px)
- `data-desktop-height="900"` - Desktop (default: 600px)

**Example - Responsive Main Content Area**:
```html
<div id="quote-widget"></div>
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="quote-widget"
  data-mobile-height="1300"
  data-tablet-height="1100"
  data-desktop-height="900">
</script>
```

**Recommended Starting Values**:
| Device | Recommended Height | Notes |
|--------|-------------------|-------|
| Mobile | 1200-1400px | Questions stack more on small screens |
| Tablet | 1000-1200px | Medium viewport |
| Desktop | 800-1000px | Wider viewport allows more content |

---

### Option 3: Breakpoint-Specific (Maximum Control)

Define heights for specific screen size ranges. Best for:
- Complex layouts
- Fine-tuned control per breakpoint
- Advanced customization

**Attributes**:
- `data-small-height="1400"` - Screens ≤ 480px
- `data-medium-height="1200"` - Screens 481-1024px
- `data-large-height="900"` - Screens > 1024px

**Example - Precise Breakpoint Control**:
```html
<div id="quote-widget"></div>
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="quote-widget"
  data-small-height="1500"
  data-medium-height="1200"
  data-large-height="850">
</script>
```

**Breakpoint Definitions**:
- **Small**: 0-480px (phones)
- **Medium**: 481-1024px (tablets, landscape phones)
- **Large**: 1025px+ (desktops, large tablets)

---

## Additional Customization

### Adjust Max Width
Control how wide the widget can be:

```html
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="quote-widget"
  data-height="1200"
  data-max-width="500">
</script>
```

**Max Width Options**:
- `data-max-width="400"` - Very narrow (300-400px max)
- `data-max-width="600"` - Narrow (sidebar width)
- `data-max-width="800"` - Medium (default, good for most)
- `data-max-width="1000"` - Wide (full-width content)

---

## Complete Examples

### Example 1: Sidebar Widget (400px wide)
```html
<!-- HTML Container -->
<aside class="sidebar">
  <div id="quote-form"></div>
</aside>

<!-- Embed Script -->
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="quote-form"
  data-height="1300"
  data-max-width="350">
</script>
```

### Example 2: Main Content Widget (Responsive)
```html
<!-- HTML Container -->
<main class="content">
  <section id="quote-widget"></section>
</main>

<!-- Embed Script -->
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="quote-widget"
  data-mobile-height="1400"
  data-tablet-height="1200"
  data-desktop-height="950">
</script>
```

### Example 3: Popup/Modal Widget
```html
<!-- HTML Container (in modal) -->
<div class="modal-body">
  <div id="quote-modal"></div>
</div>

<!-- Embed Script -->
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="quote-modal"
  data-height="1100"
  data-max-width="600">
</script>
```

### Example 4: Landing Page (Full Responsive)
```html
<!-- HTML Container -->
<section class="hero">
  <div id="quote-cta"></div>
</section>

<!-- Embed Script -->
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="quote-cta"
  data-small-height="1500"
  data-medium-height="1300"
  data-large-height="1000">
</script>
```

---

## How to Determine the Right Height

### Method 1: Test and Adjust
1. Start with a base height (e.g., 1200px)
2. Embed the widget on your page
3. Fill out the form and navigate through questions
4. If content is cut off, increase height
5. If there's excessive empty space, decrease height

### Method 2: Calculate Based on Questions
1. Each question section needs ~100-150px
2. Buttons need ~150-200px each
3. Navigation buttons need ~80px
4. Add buffer for margins/padding (~100px)

**Formula**: `(Number of questions × 120px) + 250px = Recommended Height`

### Method 3: Use Browser DevTools
1. Open DevTools (F12)
2. Inspect the iframe
3. Scroll through form and note maximum height needed
4. Add 100-200px buffer for safety

---

## Troubleshooting

### Issue: Questions are cut off or text is hidden
**Solution**: Increase the height value
- Try adding 200-300px to current height
- Use `data-height="1500"` as a test

### Issue: Too much empty space below content
**Solution**: Decrease the height value
- Reduce by 100-200px increments
- Use `data-height="900"` as a test

### Issue: Different heights needed on different pages
**Solution**: Use a separate script tag for each page
```html
<!-- Page 1: Sidebar (narrow) -->
<script src="..." data-height="1200" ...></script>

<!-- Page 2: Main content (wide) -->
<script src="..." data-height="900" ...></script>
```

### Issue: Mobile looks good but desktop is cramped
**Solution**: Use responsive heights
```html
<script src="..." 
  data-mobile-height="1200"
  data-desktop-height="900"
></script>
```

---

## All Configuration Attributes

| Attribute | Type | Default | Purpose |
|-----------|------|---------|---------|
| `data-height` | integer | - | Fixed height for all devices |
| `data-mobile-height` | integer | 900 | Height for mobile phones |
| `data-tablet-height` | integer | 900 | Height for tablets |
| `data-desktop-height` | integer | 600 | Height for desktop |
| `data-small-height` | integer | - | Height for ≤480px screens |
| `data-medium-height` | integer | - | Height for 481-1024px screens |
| `data-large-height` | integer | - | Height for >1024px screens |
| `data-max-width` | integer | 800 | Maximum width in pixels |
| `data-base-url` | string | required | Your site URL |
| `data-container-id` | string | required | HTML element ID |
| `data-first-name` | string | - | Pre-fill first name |
| `data-last-name` | string | - | Pre-fill last name |
| `data-email` | string | - | Pre-fill email |
| `data-phone` | string | - | Pre-fill phone |
| `data-address` | string | - | Pre-fill address |
| `data-city` | string | - | Pre-fill city |
| `data-state` | string | - | Pre-fill state |
| `data-postal-code` | string | - | Pre-fill postal code |

---

## Priority Order

If multiple height options are specified, they're applied in this order:

1. **Fixed Height** (`data-height`) - If set, overrides all others
2. **Breakpoint Heights** (`data-small-height`, `data-medium-height`, `data-large-height`) - If any set, used next
3. **Device Type Heights** (`data-mobile-height`, `data-tablet-height`, `data-desktop-height`) - Fallback

**Example**: If you set all three, fixed height wins:
```html
<!-- data-height="1200" will be used, others ignored -->
<script
  data-height="1200"
  data-mobile-height="1400"
  data-small-height="1500"
>
```

---

## Testing Checklist

- [ ] Widget displays on all screen sizes
- [ ] First question is fully visible on load
- [ ] All questions are readable without horizontal scrolling
- [ ] No text is cut off or hidden
- [ ] Navigation buttons are fully accessible
- [ ] Form can be submitted without scrolling too much
- [ ] Resizing window properly adjusts height

---

## Browser Compatibility

Works on:
- ✅ Chrome, Firefox, Safari, Edge (all modern versions)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile, Firefox Mobile)
- ✅ Tablets (iPad, Android tablets)
- ✅ Desktop browsers

---

## Need Help?

If questions don't fit properly:

1. **For narrow containers**: Start with `data-height="1400"`
2. **For responsive**: Use `data-mobile-height="1300" data-desktop-height="900"`
3. **When in doubt**: Use fixed height with sufficient space (1200px is a good default)

---

## Version History

- **v1.1** (Jan 22, 2026): Added multiple height configuration options
- **v1.0** (Initial): Fixed mobile/desktop heights

---

**The widget will now properly accommodate all form questions regardless of your container size!**
