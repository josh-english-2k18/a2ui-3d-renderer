import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Edges, RoundedBox } from '@react-three/drei';
import { Group } from 'three';
import { RenderNode } from '../types';

interface A2UINodeProps {
  node: RenderNode;
  canvasWidth: number;
  canvasHeight: number;
  coordinateSpace?: 'absolute' | 'local';
}

// Helper to convert Top-Left layout to Three.js Center-Based coordinates
// We now ignore elevation in the return value for the Group prop, as we handle Z via useFrame
const getPosition = (layout: RenderNode['layout'], canvasW: number, canvasH: number): [number, number, number] => {
  const x = layout.x + (layout.width / 2) - (canvasW / 2);
  const y = (canvasH / 2) - (layout.y + (layout.height / 2));
  return [x, y, 0];
};

export const A2UINode: React.FC<A2UINodeProps> = ({
  node,
  canvasWidth,
  canvasHeight,
  coordinateSpace = 'absolute'
}) => {
  const { type, layout, props, children } = node;
  const groupRef = useRef<Group>(null);
  const [hovered, setHover] = useState(false);
  const [active, setActive] = useState(false);

  // Animation logic applied to the entire group (including children)
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smooth hover lift
      // We animate the Group Z to the desired elevation + hover offset
      const targetZ = (props?.elevation || 0) + (hovered ? 20 : 0);
      groupRef.current.position.z += (targetZ - groupRef.current.position.z) * delta * 12;
      
      // Subtle float for cards
      if (type === 'Card' || type === 'Button') {
         // Tilt towards mouse slightly
         const targetRotX = (state.mouse.y * 0.1) * (hovered ? 2 : 0.5);
         const targetRotY = (state.mouse.x * 0.1) * (hovered ? 2 : 0.5);
         
         // Only rotate if it's a top-level interactive element to avoid nested rotation chaos
         if (props?.elevation && props.elevation > 5) {
             groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * delta * 5;
             groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * delta * 5;
         }
      }
    }
  });

  const position = coordinateSpace === 'absolute'
    ? getPosition(layout, canvasWidth, canvasHeight)
    : [0, 0, 0];
  
  // -- COMPONENT MAPPING --

  if (type === 'Surface') {
    // Root container, just render children
    return (
      <group>
        {children?.map(c => (
          <A2UINode key={c.id} node={c} canvasWidth={canvasWidth} canvasHeight={canvasHeight} />
        ))}
      </group>
    );
  }

  if (type === 'Card' || type === 'Button' || type === 'Column' || type === 'Row') {
    const isButton = type === 'Button';
    const isContainerOnly = (type === 'Column' || type === 'Row') && !props?.style?.backgroundColor;
    const childLayerZ = isContainerOnly ? 0 : 10;

    const renderChildren = () => {
      if (!children) return null;
      return (
        <group position={[-layout.width / 2, layout.height / 2, childLayerZ]}>
          {children.map(c => {
            const relX = c.layout.x - layout.x;
            const relY = c.layout.y - layout.y;
            return (
              <group key={c.id} position={[relX + c.layout.width / 2, -(relY + c.layout.height / 2), 0]}>
                <A2UINode
                  node={c}
                  canvasWidth={canvasWidth}
                  canvasHeight={canvasHeight}
                  coordinateSpace="local"
                />
              </group>
            );
          })}
        </group>
      );
    };
    
    if (isContainerOnly) {
      return (
        <group position={position} ref={groupRef}>
          {renderChildren()}
        </group>
      );
    }

    const rawColor = props?.style?.backgroundColor || '#111';
    // Ensure it's not pure black so lights catch it
    const bgColor = rawColor === '#000000' ? '#111111' : rawColor;
    const borderRadius = props?.style?.borderRadius || 0;
    
    // Determine Edge Color
    const edgeColor = hovered ? '#ffffff' : '#555555';

    const eventHandlers = {
        onPointerOver: (e: any) => { e.stopPropagation(); setHover(true); document.body.style.cursor = isButton ? 'pointer' : 'default'; },
        onPointerOut: () => { setHover(false); document.body.style.cursor = 'auto'; },
        onPointerDown: () => isButton && setActive(true),
        onPointerUp: () => isButton && setActive(false),
        onClick: (e: any) => {
            e.stopPropagation();
            if(props?.onClick) console.log(`Action Dispatched: ${props.onClick}`);
        }
    };

    return (
      <group position={position} ref={groupRef}>
        {/* Render Geometry */}
        {borderRadius > 0 ? (
            <RoundedBox 
                args={[layout.width, layout.height, 8]} 
                radius={borderRadius} 
                smoothness={4}
                {...eventHandlers}
            >
                <meshStandardMaterial
                    color={active ? '#ffffff' : bgColor}
                    emissive={bgColor}
                    emissiveIntensity={hovered ? 0.6 : 0.25}
                    roughness={0.2}
                    metalness={0.6}
                />
                <Edges 
                    threshold={15} 
                    color={edgeColor}
                    scale={1.0}
                    renderOrder={1000}
                />
            </RoundedBox>
        ) : (
            <mesh {...eventHandlers}>
                <boxGeometry args={[layout.width, layout.height, 8]} />
                <meshStandardMaterial
                    color={active ? '#ffffff' : bgColor}
                    emissive={bgColor}
                    emissiveIntensity={hovered ? 0.6 : 0.25}
                    roughness={0.2}
                    metalness={0.6}
                />
                <Edges 
                    threshold={15} 
                    color={edgeColor}
                    scale={1.0}
                    renderOrder={1000}
                />
            </mesh>
        )}
        
        {/* Render button text centered if implicit */}
        {isButton && props?.text && (
            <group position={[0, 0, 10]}>
                 <Text
                    fontSize={14}
                    color="#000000"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0}
                    font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
                  >
                    {props.text.toUpperCase()}
                  </Text>
            </group>
        )}

        {/* Render Children relative to this group */}
        {renderChildren()}
      </group>
    );
  }

  // Pure Text Node
  if (type === 'Text') {
    const fontSize = 14;
    // Bright white for data, grey for labels
    const isValue = props?.text?.includes('%') || props?.text?.includes('ms') || !isNaN(Number(props?.text));
    const color = isValue ? '#ffffff' : '#888888'; 
    const textPosition: [number, number, number] = [position[0], position[1], position[2] + 6];

    // Position text higher (Z=6) to ensure it sits above the standard box geometry (Z depth 8 => top at 4)
    return (
       <group position={textPosition}>
        <Text
          fontSize={fontSize}
          color={color}
          anchorX="center" 
          anchorY="middle"
          maxWidth={layout.width}
          textAlign="center"
          outlineWidth={0}
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
        >
          {props?.text}
        </Text>
      </group>
    );
  }

  return null;
};

export const FlatTreeRenderer: React.FC<{ root: RenderNode }> = ({ root }) => {
  return (
    <A2UINode
      node={root}
      canvasWidth={root.layout.width}
      canvasHeight={root.layout.height}
    />
  );
};
