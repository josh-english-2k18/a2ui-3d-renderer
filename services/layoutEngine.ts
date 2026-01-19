import { A2UIComponent, RenderNode, ComputedLayout } from '../types';

/**
 * A simplified synchronous layout engine that mimics Yoga.
 * It traverses the tree and calculates absolute X/Y/W/H for WebGL rendering.
 * 
 * Coordinate System:
 * 0,0 is Top-Left of the container.
 * In Three.js, we will map this to Center-based coordinates later.
 */

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 800; // Virtual resolution

export const calculateLayout = (root: A2UIComponent): RenderNode => {
  const computedRoot = computeNodeLayout(root, CANVAS_WIDTH, CANVAS_HEIGHT, 0, 0);
  return computedRoot;
};

const computeNodeLayout = (
  node: A2UIComponent, 
  availableWidth: number, 
  availableHeight: number,
  absX: number,
  absY: number
): RenderNode => {
  
  const style = node.props?.style || {};
  const padding = style.padding || 0;
  const gap = style.gap || 0;
  
  // Infer flex direction: default to column unless explicitly row, or component type is Row
  let isRow = style.flexDirection === 'row';
  if (!style.flexDirection && node.type === 'Row') {
      isRow = true;
  }
  
  // Determine intrinsic size
  let width = availableWidth;
  let height = 0;

  // Handle explicit sizing
  if (typeof style.width === 'number') width = style.width;
  if (typeof style.height === 'number') height = style.height;

  // Compute children first to determine content size if auto
  const computedChildren: RenderNode[] = [];
  
  let currentX = absX + padding;
  let currentY = absY + padding;
  let maxChildDim = 0; // Max width (if col) or height (if row)
  
  // Available space for children
  const childAvailableWidth = width - (padding * 2);
  
  if (node.children) {
    // PASS 1: Calculate children sizes
    for (const child of node.children) {
      const childStyle = child.props?.style || {};
      
      // Inherit width if column, or split if row (simplified)
      let childW = isRow ? ((childAvailableWidth - (gap * (node.children.length - 1))) / node.children.length) : childAvailableWidth;
      
      // Overrides
      if (typeof childStyle.width === 'number') childW = childStyle.width;
      
      // Height is usually auto (content based) unless specified
      let childH = typeof childStyle.height === 'number' ? childStyle.height : 0;
      
      // Text nodes need loose estimation
      if (child.type === 'Text') {
        childH = 30; // Base line height approximation
        if (child.props?.style?.height) childH = Number(child.props.style.height);
      }
      
      // Buttons
      if (child.type === 'Button') {
        childH = 60;
      }

      // If component is a container, recurse to get its auto height
      if (['Row', 'Column', 'Card'].includes(child.type)) {
         const tempLayout = computeNodeLayout(child, childW, 0, 0, 0); // Dry run for size
         childH = tempLayout.layout.height;
      }

      const computedChild = computeNodeLayout(child, childW, childH, 0, 0); 
      computedChildren.push(computedChild);
    }

    // PASS 2: Position children
    
    // Calculate total content size for Justify Content
    const totalContentSize = computedChildren.reduce((acc, c) => acc + (isRow ? c.layout.width : c.layout.height), 0);
    const containerSize = isRow ? width : height;
    
    let currentGap = gap;
    let startOffset = 0;
    
    // Handle Justify Content
    if (style.justifyContent === 'center') {
        if (containerSize > 0) {
            startOffset = (containerSize - totalContentSize - (gap * (computedChildren.length - 1)) - (padding * 2)) / 2;
        }
    } else if (style.justifyContent === 'space-between' && computedChildren.length > 1) {
       const availableSpace = containerSize - totalContentSize - (padding * 2);
       if (availableSpace > 0) {
           currentGap = availableSpace / (computedChildren.length - 1);
       }
    }
    
    if (isRow) currentX += startOffset;
    else currentY += startOffset;

    for (const child of computedChildren) {
      // Align items (Cross Axis)
      let crossAxisOffset = 0;
      
      if (style.alignItems === 'center') {
        if (isRow) {
           // Center vertically
           crossAxisOffset = (height > 0 ? (height - (padding*2) - child.layout.height) / 2 : 0);
        } else {
           // Center horizontally
           crossAxisOffset = (width > 0 ? (width - (padding*2) - child.layout.width) / 2 : 0);
        }
      } else if (style.alignItems === 'flex-end') {
        if (isRow) {
            // Align Bottom
            crossAxisOffset = (height > 0 ? (height - (padding*2) - child.layout.height) : 0);
        } else {
            // Align Right
            crossAxisOffset = (width > 0 ? (width - (padding*2) - child.layout.width) : 0);
        }
      }

      const finalX = isRow ? currentX : currentX + crossAxisOffset;
      const finalY = isRow ? currentY + crossAxisOffset : currentY;

      // Update child absolute position
      updateAbsolutePosition(child, finalX, finalY);
      
      // Advance main axis using the calculated gap
      if (isRow) {
        currentX += child.layout.width + currentGap;
        maxChildDim = Math.max(maxChildDim, child.layout.height);
      } else {
        currentY += child.layout.height + currentGap;
        maxChildDim = Math.max(maxChildDim, child.layout.width);
      }
    }
    
    // Auto-Size container if height/width not set
    if (typeof style.height !== 'number') {
      height = isRow ? (maxChildDim + padding * 2) : (currentY - absY); 
    }
  } else {
    // Leaf node defaults
    if (height === 0) height = 50; 
  }

  return {
    ...node,
    children: computedChildren,
    layout: {
      x: absX,
      y: absY,
      width,
      height
    }
  };
};

const updateAbsolutePosition = (node: RenderNode, x: number, y: number) => {
  const dx = x - node.layout.x;
  const dy = y - node.layout.y;
  node.layout.x = x;
  node.layout.y = y;
  
  // Recursively shift children
  if (node.children) {
    node.children.forEach(c => updateAbsolutePosition(c, c.layout.x + dx, c.layout.y + dy));
  }
}