import type { Profile, ProjectListItem, SkillCategory } from '@/types/api';
import { STATUS_LABEL } from '@/lib/format';

/** A syntax-highlighted token. Colours are applied by the CodeWindow from the active theme. */
export type TokenType = 'kw' | 'key' | 'str' | 'punc' | 'com' | 'plain';
export interface Token {
  t: TokenType;
  v: string;
}
export type Line = Token[];

export interface Snippet {
  file: string;
  lines: Line[];
}

const kw = (v: string): Token => ({ t: 'kw', v });
const key = (v: string): Token => ({ t: 'key', v });
const str = (v: string): Token => ({ t: 'str', v: JSON.stringify(v) });
const punc = (v: string): Token => ({ t: 'punc', v });
const plain = (v: string): Token => ({ t: 'plain', v });
const com = (v: string): Token => ({ t: 'com', v });

const indent = (n: number): Token => plain(' '.repeat(n));

/** Splits long text into word-wrapped chunks so a string literal can span several lines joined with "+". */
function wrap(text: string, max = 34): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > max) {
      chunks.push(current + ' ');
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

const camel = (name: string) =>
  name
    .replace(/&/g, ' and ')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase()))
    .join('');

/** Builds the three tabs of the hero code window from real API data — nothing is hardcoded or invented. */
export function buildSnippets(profile: Profile, skills: SkillCategory[] | undefined, projects: ProjectListItem[] | undefined): Snippet[] {
  const snippets: Snippet[] = [];

  // ---- profile.ts
  const profileLines: Line[] = [
    [kw('const '), plain('developer '), punc('= {')],
    [indent(2), key('name'), punc(': '), str(profile.fullName), punc(',')],
    [indent(2), key('location'), punc(': '), str(profile.location), punc(',')],
    [indent(2), key('roles'), punc(': [')],
    ...profile.titles.map((t): Line => [indent(4), str(t), punc(',')]),
    [indent(2), punc('],')],
  ];
  if (profile.objective) {
    profileLines.push([indent(2), key('objective'), punc(':')]);
    const chunks = wrap(profile.objective);
    chunks.forEach((chunk, i) => profileLines.push([indent(4), str(chunk), punc(i < chunks.length - 1 ? ' +' : ',')]));
  }
  profileLines.push([punc('};')]);
  snippets.push({ file: 'developer.ts', lines: profileLines });

  // ---- stack.ts
  if (skills && skills.length) {
    const lines: Line[] = [[kw('export const '), plain('stack '), punc('= {')]];
    for (const cat of skills.slice(0, 4)) {
      lines.push([indent(2), key(camel(cat.name)), punc(': [')]);
      const shown = cat.skills.slice(0, 4);
      shown.forEach((s) => lines.push([indent(4), str(s.name), punc(',')]));
      if (cat.skills.length > shown.length) lines.push([indent(4), com(`// +${cat.skills.length - shown.length} more`)]);
      lines.push([indent(2), punc('],')]);
    }
    lines.push([punc('};')]);
    snippets.push({ file: 'stack.ts', lines });
  }

  // ---- projects.ts
  if (projects && projects.length) {
    const lines: Line[] = [[kw('export const '), plain('projects '), punc('= [')]];
    for (const p of projects.slice(0, 4)) {
      lines.push([indent(2), punc('{ '), key('name'), punc(': '), str(p.title), punc(', '), key('status'), punc(': '), str(STATUS_LABEL[p.status].toLowerCase()), punc(' },')]);
    }
    lines.push([punc('];')]);
    snippets.push({ file: 'projects.ts', lines });
  }

  return snippets;
}
