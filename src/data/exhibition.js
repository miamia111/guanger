import data from './exhibition.json';

// Compatibility adapter: the management tool owns exhibition.json.
// Frontend modules should import these named exports, never duplicate data here.
export const { exhibition, chapters, works } = data;
