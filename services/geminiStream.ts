import { StreamMessage, A2UIComponent } from '../types';

const DEFAULT_MODEL = 'gemini-3-flash';

const buildPrompt = () => `
Return a single JSON object that matches this TypeScript interface:
interface A2UIComponent {
  id: string;
  type: 'Surface' | 'Column' | 'Row' | 'Card' | 'Text' | 'Button';
  props?: {
    text?: string;
    onClick?: string;
    style?: {
      width?: number;
      height?: number;
      padding?: number;
      gap?: number;
      flexDirection?: 'row' | 'column';
      alignItems?: 'flex-start' | 'center' | 'flex-end';
      justifyContent?: 'flex-start' | 'center' | 'space-between';
      backgroundColor?: string;
      borderRadius?: number;
    };
    elevation?: number;
  };
  children?: A2UIComponent[];
}

Constraints:
- Root must be type "Surface" with id "root".
- Root style must include width 1000 and height 800, padding 40, gap 20.
- Use only the component types listed above.
- Create a header card and a row of three cards below it.
- Use hex colors (e.g. "#1c1f24").
- Return raw JSON only, no markdown or commentary.
`.trim();

const extractJson = (text: string) => {
  const withoutFences = text.replace(/```json|```/gi, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Gemini response did not include a JSON object.');
  }
  return withoutFences.slice(start, end + 1);
};

const normalizeRoot = (root: A2UIComponent): A2UIComponent => {
  if (!root.id) root.id = 'root';
  if (!root.type) root.type = 'Surface';
  if (!root.props) root.props = {};
  if (!root.props.style) root.props.style = {};
  if (typeof root.props.style.width !== 'number') root.props.style.width = 1000;
  if (typeof root.props.style.height !== 'number') root.props.style.height = 800;
  if (typeof root.props.style.padding !== 'number') root.props.style.padding = 40;
  if (typeof root.props.style.gap !== 'number') root.props.style.gap = 20;
  return root;
};

export const createGeminiStream = async function* (apiKey: string) {
  yield {
    type: 'heartbeat',
    timestamp: Date.now(),
    payload: { status: 'connected', model: DEFAULT_MODEL }
  } as StreamMessage;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: buildPrompt() }]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          topP: 0.9,
          maxOutputTokens: 2048
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const responseText = data?.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text || '')
    .join('')
    .trim();

  if (!responseText) {
    throw new Error('Gemini response was empty.');
  }

  const root = normalizeRoot(JSON.parse(extractJson(responseText)));

  yield {
    type: 'surfaceUpdate',
    timestamp: Date.now(),
    payload: { surfaceId: 'main', root }
  } as StreamMessage;
};
