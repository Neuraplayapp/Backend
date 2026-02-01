# Canvas Chart Compatibility Guide

## Supported Chart Types ✅

The following chart types are **fully supported** and work reliably in the canvas:

### Basic Charts
- **`bar`** - Bar charts with single series (recommended)
- **`line`** - Line charts with markers
- **`scatter`** - Scatter plots with dots
- **`histogram`** - Distribution histograms
- **`pie`** - Pie charts with segments

### Advanced Charts  
- **`heatmap`** - 2D heatmaps with color gradients
- **`3d_scatter`** - 3D scatter plots (interactive)
- **`3d_surface`** - 3D surface plots (interactive)
- **`sankey`** - Flow diagrams
- **`sunburst`** - Hierarchical sunburst charts

## Chart Generation Rules

### ✅ What Works Well
1. **Single Chart Generation**: Each tool call creates exactly ONE chart
2. **Fixed Position**: Charts stay in position for stability (non-moveable)
3. **Text Integration**: Charts can have companion text elements for descriptions
4. **Interactive Features**: Zoom, pan, hover tooltips work within chart area
5. **Delete Functionality**: Charts can be deleted using the trash button when selected

### ⚠️ Limitations
1. **Multiple Series**: Bar charts automatically use only the first series to prevent multiple chart generation
2. **Chart Movement**: Charts are intentionally non-draggable for stability
3. **Chart Resizing**: Charts maintain fixed size for consistent rendering

### ❌ Problematic Chart Types
These types may cause issues and should be avoided:
- Complex multi-series bar charts
- Real-time updating charts
- Charts requiring external data feeds
- Very large datasets (>1000 points)

## Text Element Integration

### ✅ Text Features That Work
- **Headers**: Large text for chart titles
- **Descriptions**: Explanatory text below charts  
- **Captions**: Small text for details
- **Multiple Text Elements**: Can have several text elements alongside charts
- **Text Formatting**: Different font sizes and alignments

### Text + Chart Best Practices
1. Use `scribble_text_create` for headers and descriptions
2. Position text elements near related charts
3. Use consistent font sizes (16px normal, 24px headers)
4. Keep text concise for better canvas organization

## Tool Usage

### Chart Creation
```javascript
// Use this tool for charts
scribble_chart_create({
  title: "My Chart",
  type: "bar", // one of the supported types above
  series: [/* single data series */],
  description: "Optional chart description"
})
```

### Text Creation  
```javascript
// Use this tool for text elements
scribble_text_create({
  text: "Chart explanation or header",
  style: "header", // header, subheader, normal, caption
  align: "left" // left, center, right
})
```

## Debugging Chart Issues

### If Charts Don't Appear
1. Check console for chart generation errors
2. Verify chart type is in supported list
3. Ensure data series is properly formatted
4. Try refreshing the canvas

### If Multiple Charts Appear
1. This indicates a data processing issue
2. The system should automatically prevent this
3. Report as a bug if it persists

### If Text Doesn't Show
1. Verify text content is not empty
2. Check if text element is positioned correctly
3. Ensure font size is appropriate for canvas zoom level
4. Try adding a text element manually using the "T" button

## Performance Notes

- Charts with >500 data points may render slowly
- 3D charts require more processing power
- Multiple charts on canvas may impact performance
- Text elements are very lightweight and don't impact performance

## Future Improvements

- Chart movement/resizing capabilities
- Chart linking and relationships
- Real-time data updates
- More chart type support
- Better text-chart positioning tools
