import { StreamMessage } from '../types';

export const createMockStream = async function* () {
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 1. Initial Handshake
  yield {
    type: 'heartbeat',
    timestamp: Date.now(),
    payload: { status: 'connected', latency: '12ms' }
  } as StreamMessage;

  await wait(800);

  // 2. Begin Rendering - Skeleton
  const rootSkeleton = {
    id: 'root',
    type: 'Surface',
    props: { style: { flexDirection: 'column', padding: 40, gap: 20, alignItems: 'center', backgroundColor: '#0f1115', width: 1000, height: 800 } },
    children: [
        {
            id: 'header',
            type: 'Card',
            props: { style: { width: 900, height: 80, borderRadius: 20, backgroundColor: '#1c1f24', flexDirection: 'row', alignItems: 'center', padding: 20, gap: 20 }, elevation: 5 },
            children: [
                { id: 'logo', type: 'Card', props: { style: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3b82f6' } } },
                { id: 'title', type: 'Text', props: { text: 'Loading...', style: { width: 400 } } }
            ]
        },
        {
            id: 'grid',
            type: 'Row',
            props: { style: { gap: 20, width: 900, height: 500, flexDirection: 'row', justifyContent: 'center' } },
            children: [] 
        }
    ]
  };

  yield {
    type: 'surfaceUpdate',
    timestamp: Date.now(),
    payload: { surfaceId: 'main', root: rootSkeleton }
  } as StreamMessage;

  await wait(1200);

  // --- HELPER FUNCTIONS FOR RICH UI GENERATION ---

  const createProgressBar = (label: string, percentage: number, color: string, idPrefix: string) => ({
      type: 'Column',
      props: { style: { gap: 5, width: 220, height: 40 } },
      children: [
          { type: 'Row', props: { style: { width: 220, height: 20, justifyContent: 'space-between', alignItems: 'center' } }, children: [
              { type: 'Text', props: { text: label, style: { width: 100 } } },
              { id: `${idPrefix}-value`, type: 'Text', props: { text: `${percentage}%`, style: { width: 50 } } }
          ]},
          { type: 'Card', props: { style: { width: 220, height: 6, borderRadius: 3, backgroundColor: '#333' } }, children: [
              { id: `${idPrefix}-bar`, type: 'Card', props: { style: { width: 2.2 * percentage, height: 6, borderRadius: 3, backgroundColor: color }, elevation: 2 } }
          ]}
      ]
  });

  const createHistogram = (color: string) => {
      const bars = [];
      for(let i=0; i<12; i++) {
          const h = 20 + Math.random() * 80;
          bars.push({
              type: 'Card',
              props: { style: { width: 10, height: h, borderRadius: 4, backgroundColor: color }, elevation: 5 }
          });
      }
      return {
          type: 'Row',
          props: { style: { width: 232, height: 120, gap: 8, alignItems: 'flex-end', justifyContent: 'center', backgroundColor: '#111', borderRadius: 12, padding: 10 } },
          children: bars
      };
  };

  const createDataGrid = () => {
      const rows = [];
      for(let r=0; r<4; r++) {
          const cols = [];
          for(let c=0; c<6; c++) {
              const active = Math.random() > 0.3;
              cols.push({
                  type: 'Card',
                  props: { style: { width: 25, height: 25, borderRadius: 4, backgroundColor: active ? '#10b981' : '#333' }, elevation: active ? 5 : 0 }
              });
          }
          rows.push({ type: 'Row', props: { style: { gap: 5, width: 232, height: 25 } }, children: cols });
      }
      return {
          type: 'Column',
          props: { style: { gap: 5, width: 232, height: 120, justifyContent: 'center', alignItems: 'center' } },
          children: rows
      };
  };

  // 3. Populate Rich Content
  const fullRoot = JSON.parse(JSON.stringify(rootSkeleton));
  
  // Update Title
  fullRoot.children[0].children[1].props.text = "MISSION CONTROL // A2UI";
  
  // Create Widgets
  const w1 = {
    id: 'w1',
    type: 'Card',
    props: { style: { width: 280, height: 420, borderRadius: 24, padding: 24, backgroundColor: '#181b21', flexDirection: 'column', gap: 20 }, elevation: 10 },
    children: [
        { type: 'Text', props: { text: 'SYSTEM INTEGRITY', style: { height: 20, width: 232 } } },
        createProgressBar('CPU Load', 34, '#3b82f6', 'cpu'),
        createProgressBar('Memory', 62, '#8b5cf6', 'mem'),
        createProgressBar('Thermal', 12, '#10b981', 'therm'),
        { type: 'Card', props: { style: { width: 232, height: 2, backgroundColor: '#333' } } }, // Divider
        { type: 'Row', props: { style: { width: 232, height: 40, justifyContent: 'space-between', alignItems: 'center' } }, children: [
             { type: 'Text', props: { text: 'STATUS', style: { width: 80 } } },
             { type: 'Card', props: { style: { width: 80, height: 24, borderRadius: 12, backgroundColor: '#064e3b' }, elevation: 5 }, children: [
                 { type: 'Text', props: { text: 'OPTIMAL', style: { width: 80 } } }
             ]}
        ]},
        { type: 'Button', props: { text: 'DIAGNOSTICS', onClick: 'run_diag', style: { width: 232, height: 44, borderRadius: 12, backgroundColor: '#3b82f6' } } }
    ]
  };

  const w2 = {
    id: 'w2',
    type: 'Card',
    props: { style: { width: 280, height: 420, borderRadius: 24, padding: 24, backgroundColor: '#181b21', flexDirection: 'column', gap: 20 }, elevation: 10 },
    children: [
        { type: 'Text', props: { text: 'NETWORK LATENCY', style: { height: 20, width: 232 } } },
        createHistogram('#f59e0b'),
        { type: 'Row', props: { style: { width: 232, height: 30, justifyContent: 'space-between' } }, children: [
            { id: 'latency-min', type: 'Text', props: { text: 'Min: 12ms', style: { width: 100 } } },
            { id: 'latency-max', type: 'Text', props: { text: 'Max: 84ms', style: { width: 100 } } }
        ]},
        { type: 'Card', props: { style: { width: 232, height: 60, borderRadius: 12, backgroundColor: '#202020', flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 } }, children: [
            { type: 'Card', props: { style: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f59e0b' } } },
            { type: 'Column', props: { style: { width: 150, height: 40, justifyContent: 'center', gap: 5 } }, children: [
                { type: 'Text', props: { text: 'US-EAST-1', style: { width: 150 } } },
                { type: 'Text', props: { text: 'Connected', style: { width: 150 } } }
            ]}
        ]},
        { type: 'Button', props: { text: 'PING TEST', onClick: 'ping', style: { width: 232, height: 44, borderRadius: 12, backgroundColor: '#f59e0b' } } }
    ]
  };

  const w3 = {
    id: 'w3',
    type: 'Card',
    props: { style: { width: 280, height: 420, borderRadius: 24, padding: 24, backgroundColor: '#181b21', flexDirection: 'column', gap: 20 }, elevation: 10 },
    children: [
        { type: 'Text', props: { text: 'ACTIVE CLUSTERS', style: { height: 20, width: 232 } } },
        createDataGrid(),
        { type: 'Row', props: { style: { width: 232, height: 40, gap: 10, alignItems: 'center' } }, children: [
            { type: 'Card', props: { style: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#10b981' } } },
            { type: 'Text', props: { text: '18 Online', style: { width: 80 } } },
            { type: 'Card', props: { style: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#333' } } },
            { type: 'Text', props: { text: '6 Offline', style: { width: 80 } } }
        ]},
        { type: 'Card', props: { style: { width: 232, height: 50, borderRadius: 12, backgroundColor: '#202020', padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' } }, children: [
            { type: 'Text', props: { text: 'Total Load', style: { width: 100 } } },
            { type: 'Text', props: { text: '4,203 TB', style: { width: 80 } } }
        ]},
        { type: 'Button', props: { text: 'MANAGE NODES', onClick: 'nodes', style: { width: 232, height: 44, borderRadius: 12, backgroundColor: '#ec4899' } } }
    ]
  };

  fullRoot.children[1].children = [w1, w2, w3];

  yield {
    type: 'surfaceUpdate',
    timestamp: Date.now(),
    payload: { surfaceId: 'main', root: fullRoot }
  } as StreamMessage;

  // 4. Interactive Data Updates (Simulated)
  while (true) {
    await wait(2000);
    const cpu = Math.floor(20 + Math.random() * 60);
    const mem = Math.floor(30 + Math.random() * 60);
    const therm = Math.floor(5 + Math.random() * 40);
    const latencyMin = Math.floor(8 + Math.random() * 20);
    const latencyMax = latencyMin + Math.floor(40 + Math.random() * 60);

    const updates = [
      { path: 'cpu-value.props.text', value: `${cpu}%` },
      { path: 'cpu-bar.props.style.width', value: Math.round(2.2 * cpu) },
      { path: 'mem-value.props.text', value: `${mem}%` },
      { path: 'mem-bar.props.style.width', value: Math.round(2.2 * mem) },
      { path: 'therm-value.props.text', value: `${therm}%` },
      { path: 'therm-bar.props.style.width', value: Math.round(2.2 * therm) },
      { path: 'latency-min.props.text', value: `Min: ${latencyMin}ms` },
      { path: 'latency-max.props.text', value: `Max: ${latencyMax}ms` }
    ];

    for (const update of updates) {
      yield {
        type: 'dataModelUpdate',
        timestamp: Date.now(),
        payload: update
      } as StreamMessage;
    }
  }
};
