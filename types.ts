import { Vector3, Euler } from 'three';
import type { ThreeElements } from '@react-three/fiber';

// Extend global JSX namespace to include Three.js elements
declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}

// --- Protocol Types ---

export type A2UIComponentType = 'Surface' | 'Column' | 'Row' | 'Card' | 'Text' | 'Button' | 'Image';

export interface LayoutStyle {
  width?: number | string; // '100%' or number
  height?: number | string;
  padding?: number;
  gap?: number;
  flexDirection?: 'row' | 'column';
  alignItems?: 'flex-start' | 'center' | 'flex-end';
  justifyContent?: 'flex-start' | 'center' | 'space-between';
  backgroundColor?: string;
  borderRadius?: number;
}

export interface A2UIComponent {
  id: string;
  type: A2UIComponentType;
  props?: {
    text?: string; // For Text nodes
    src?: string; // For Image nodes
    onClick?: string; // Action ID
    style?: LayoutStyle;
    elevation?: number; // Visual depth z-index
  };
  children?: A2UIComponent[];
}

// --- Layout Engine Types ---

export interface ComputedLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderNode extends A2UIComponent {
  layout: ComputedLayout;
  children?: RenderNode[];
  parent?: RenderNode;
}

// --- Stream Types ---

export type MessageType = 'surfaceUpdate' | 'dataModelUpdate' | 'heartbeat';

export interface StreamMessage {
  type: MessageType;
  timestamp: number;
  payload: any;
}

export interface SurfaceUpdatePayload {
  surfaceId: string;
  root: A2UIComponent;
}

export interface DataModelUpdatePayload {
  path: string;
  value: any;
}