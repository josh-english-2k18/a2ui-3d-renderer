import React, { useEffect, useState, useRef } from 'react';
import { createMockStream } from './services/mockStream';
import { calculateLayout } from './services/layoutEngine';
import { Renderer3D } from './components/Renderer3D';
import { StreamMessage, RenderNode, A2UIComponent } from './types';

const findNodeById = (node: A2UIComponent, id: string): A2UIComponent | null => {
  if (node.id === id) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const match = findNodeById(child, id);
    if (match) return match;
  }
  return null;
};

const setNodeValue = (node: A2UIComponent, pathParts: string[], value: unknown) => {
  let target: any = node;
  for (let i = 0; i < pathParts.length - 1; i += 1) {
    const key = pathParts[i];
    if (typeof target[key] !== 'object' || target[key] === null) {
      target[key] = {};
    }
    target = target[key];
  }
  target[pathParts[pathParts.length - 1]] = value;
};

const applyDataModelUpdate = (root: A2UIComponent, update: { path?: string; value?: unknown }) => {
  if (!update?.path || typeof update.path !== 'string') return false;
  const [nodeId, ...pathParts] = update.path.split('.');
  if (!nodeId || pathParts.length === 0) return false;
  const node = findNodeById(root, nodeId);
  if (!node) return false;
  setNodeValue(node, pathParts, update.value);
  return true;
};

const App = () => {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [layoutRoot, setLayoutRoot] = useState<RenderNode | null>(null);
  const [status, setStatus] = useState('Disconnected');
  
  // Ref to hold the current data model for updates
  const rootRef = useRef<A2UIComponent | null>(null);

  useEffect(() => {
    const initStream = async () => {
      setStatus('Connecting to AI Agent...');
      const stream = createMockStream();
      
      for await (const msg of stream) {
        setMessages(prev => [msg, ...prev].slice(0, 50)); // Keep last 50
        
        if (msg.type === 'heartbeat') {
          setStatus('Connected (Streaming)');
        }
        
        if (msg.type === 'surfaceUpdate') {
          // New UI Tree
          const newRoot = msg.payload.root;
          rootRef.current = newRoot;
          const layout = calculateLayout(newRoot);
          setLayoutRoot(layout);
        }
        
        if (msg.type === 'dataModelUpdate') {
          if (rootRef.current && applyDataModelUpdate(rootRef.current, msg.payload)) {
            const layout = calculateLayout(rootRef.current);
            setLayoutRoot(layout);
          }
        }
      }
    };

    initStream();
  }, []);

  return (
    <div className="flex w-full h-screen bg-black text-white font-mono overflow-hidden">
      
      {/* LEFT: Render Output */}
      <div className="flex-1 relative border-r border-gray-800">
        <div className="absolute top-0 left-0 z-10 p-4 pointer-events-none">
          <h1 className="text-2xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            A2UI // RENDERER
          </h1>
          <div className="text-xs text-gray-500 mt-1">
            WebGL2 / Three.js r160 / Post-FX
          </div>
        </div>
        
        {/* The 3D Canvas */}
        <div className="w-full h-full cursor-crosshair">
            <Renderer3D layoutRoot={layoutRoot} />
        </div>
      </div>

      {/* RIGHT: Stream Inspector */}
      <div className="w-96 flex flex-col bg-neutral-900 shadow-2xl z-20">
        <div className="p-4 border-b border-gray-800 bg-neutral-950">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Connection</span>
            <span className="flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full ${status.includes('Connected') ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${status.includes('Connected') ? 'bg-green-500' : 'bg-red-500'}`}></span>
            </span>
          </div>
          <div className="text-sm text-gray-300">{status}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-neutral-900/50">
           <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Live Protocol Stream</div>
           
           {messages.map((m, i) => (
             <div key={i} className="group relative pl-4 border-l-2 border-gray-800 hover:border-blue-500 transition-colors">
                <div className="absolute left-[-5px] top-0 w-2 h-2 rounded-full bg-gray-800 group-hover:bg-blue-500 transition-colors" />
                <div className="flex justify-between items-baseline mb-1">
                    <span className={`text-xs font-bold ${m.type === 'surfaceUpdate' ? 'text-blue-400' : m.type === 'dataModelUpdate' ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {m.type}
                    </span>
                    <span className="text-[10px] text-gray-600">{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <pre className="text-[10px] text-gray-400 overflow-hidden text-ellipsis w-full opacity-60 group-hover:opacity-100 transition-opacity">
                    {JSON.stringify(m.payload, null, 2).substring(0, 120)}...
                </pre>
             </div>
           ))}
        </div>
        
        <div className="p-3 border-t border-gray-800 text-[10px] text-gray-600 text-center uppercase">
            A2UI Protocol v0.8.2
        </div>
      </div>
    </div>
  );
};

export default App;
