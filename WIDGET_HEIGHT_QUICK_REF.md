# Widget Height Configuration - Quick Reference

## Three Ways to Set Height

### 1️⃣ Easiest: Fixed Height (All Devices)
```html
data-height="1200"
```
✅ Best for: Consistent layouts, small containers
❌ Not responsive

---

### 2️⃣ Recommended: Responsive by Device
```html
data-mobile-height="1300"
data-tablet-height="1100"
data-desktop-height="900"
```
✅ Best for: Most websites
✅ Adapts to device type
✅ Clean and simple

---

### 3️⃣ Advanced: Precise Breakpoints
```html
data-small-height="1400"    <!-- ≤480px -->
data-medium-height="1200"   <!-- 481-1024px -->
data-large-height="900"     <!-- >1024px -->
```
✅ Best for: Complex layouts
✅ Maximum control

---

## Complete Embed Example

```html
<!-- Container -->
<div id="cleaning-quote"></div>

<!-- Script with custom heights -->
<script src="https://yoursite.com/widget.js"
  data-base-url="https://yoursite.com"
  data-container-id="cleaning-quote"
  data-mobile-height="1300"
  data-tablet-height="1100"
  data-desktop-height="900">
</script>
```

---

## Recommended Heights by Container

| Container | Width | Height |
|-----------|-------|--------|
| Sidebar | 300-400px | 1400-1500px |
| Medium | 500-700px | 1200-1300px |
| Wide | 800-1000px | 900-1000px |
| Full Width | 100% | Mobile: 1300px, Desktop: 900px |

---

## Height Formula

```
(Questions Count × 120px) + 250px = Recommended Height
```

Example: 8 questions → (8 × 120) + 250 = **1,210px** ✓

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Text cut off | Increase height by 200px |
| Too much space | Decrease height by 100px |
| Mobile too cramped | Use responsive heights |
| Desktop too tall | Use breakpoint-specific heights |

---

## All Parameters

**Height Options** (pick one):
- `data-height="1200"` - Fixed height
- `data-mobile-height`, `data-tablet-height`, `data-desktop-height`
- `data-small-height`, `data-medium-height`, `data-large-height`

**Other Options**:
- `data-max-width="800"` - Maximum width (default: 800px)
- `data-base-url="https://..."` - Required
- `data-container-id="my-widget"` - Required
- `data-first-name`, `data-last-name`, etc. - Pre-fill fields

---

## Need More Details?

See `WIDGET_HEIGHT_CONFIGURATION.md` for:
- Full examples
- Troubleshooting guide
- Testing checklist
- Browser compatibility

---

**Last Updated**: January 22, 2026  
**Status**: Ready to Use ✅
