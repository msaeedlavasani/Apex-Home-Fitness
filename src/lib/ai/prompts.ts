import fs from 'fs';
import path from 'path';

export type PromptMode = 'general' | 'injury_focused' | 'equipment_limited';

export async function loadSystemPrompt(mode: PromptMode): Promise<string> {
  const fileNameMap: Record<PromptMode, string> = {
    general: '01-general-program-generation-prompt.md',
    injury_focused: '02-injury-focused-program-prompt.md',
    equipment_limited: '03-equipment-limited-program-prompt.md',
  };

  const filePath = path.join(process.cwd(), 'prompts', fileNameMap[mode]);
  
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error loading prompt for mode ${mode}:`, error);
    throw new Error(`Failed to load system prompt: ${mode}`);
  }
}
