import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/States';
import { SKILL_ICON_MAP } from '@/components/home/Skills';
import type { SkillCategoryAdmin } from '@/types/api';
import { adminApi } from '../adminApi';
import { useConfirm, useToast } from '../components/Feedback';
import { MoveButtons } from '../components/RowControls';
import { Card, IconButton, Input, PageHeader, Select, Switch } from '../components/ui';
import { moveItem, useRefresh } from '../hooks';

const ICONS = Object.keys(SKILL_ICON_MAP);

export function SkillsPage() {
  const toast = useToast();
  const refresh = useRefresh();
  const list = useQuery({ queryKey: ['admin', 'skills'], queryFn: adminApi.skills });
  const categories = list.data ?? [];

  const run = useMutation({
    mutationFn: (fn: () => Promise<unknown>) => fn(),
    onSuccess: () => void refresh(),
    onError: (err) => toast.fromError(err),
  });

  const [newName, setNewName] = useState('');
  function addCategory(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    run.mutate(() => adminApi.createCategory({ name, description: null, icon: 'code', isVisible: true }), {
      onSuccess: () => {
        setNewName('');
        toast.success('Category added.');
      },
    });
  }

  return (
    <>
      <PageHeader title="Skills" description="Group the tools and technologies you use. Changes save as you edit. There are no percentages — a skill is simply listed." />

      {list.isPending && <Skeleton className="h-64" />}
      {list.isError && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      {list.data && categories.length === 0 && <EmptyState title="No skill categories yet">Add a category such as “Frontend”, then add skills to it.</EmptyState>}

      <div className="space-y-5">
        {categories.map((c, i) => (
          <CategoryCard
            key={c.id}
            category={c}
            index={i}
            count={categories.length}
            busy={run.isPending}
            onMove={(d) => run.mutate(() => adminApi.reorderCategories(moveItem(categories, i, d).map((x) => x.id)))}
            run={(fn, msg) => run.mutate(fn, msg ? { onSuccess: () => toast.success(msg) } : undefined)}
          />
        ))}
      </div>

      <form onSubmit={addCategory} className="mt-8 flex flex-col gap-3 sm:flex-row" aria-label="Add skill category">
        <label htmlFor="new-category" className="sr-only">
          New category name
        </label>
        <Input id="new-category" placeholder="New category, e.g. Databases" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} />
        <Button type="submit" size="md" disabled={!newName.trim() || run.isPending}>
          <Plus className="size-4" aria-hidden="true" /> Add category
        </Button>
      </form>
    </>
  );
}

function CategoryCard({ category, index, count, busy, onMove, run }: { category: SkillCategoryAdmin; index: number; count: number; busy: boolean; onMove: (d: -1 | 1) => void; run: (fn: () => Promise<unknown>, successMessage?: string) => void }) {
  const confirm = useConfirm();
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description ?? '');
  const [newSkill, setNewSkill] = useState('');

  const base = { name: category.name, description: category.description, icon: category.icon, isVisible: category.isVisible };
  const saveCategory = (patch: Partial<typeof base>) => run(() => adminApi.updateCategory(category.id, { ...base, ...patch }));

  async function removeCategory() {
    const ok = await confirm({
      title: `Delete “${category.name}”?`,
      message: category.skills.length ? `Its ${category.skills.length} skill${category.skills.length === 1 ? '' : 's'} will be deleted too.` : 'This category is empty.',
      confirmLabel: 'Delete category',
      danger: true,
    });
    if (ok) run(() => adminApi.deleteCategory(category.id), 'Category deleted.');
  }

  function addSkill(e: FormEvent) {
    e.preventDefault();
    const n = newSkill.trim();
    if (!n) return;
    run(() => adminApi.createSkill({ categoryId: category.id, name: n, note: null, isVisible: true }), 'Skill added.');
    setNewSkill('');
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-64 space-y-2">
          <label htmlFor={`cat-name-${category.id}`} className="sr-only">
            Category name
          </label>
          <Input id={`cat-name-${category.id}`} value={name} maxLength={80} className="font-display text-lg" onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== category.name && saveCategory({ name: name.trim() })} />
          <label htmlFor={`cat-desc-${category.id}`} className="sr-only">
            Category description
          </label>
          <Input id={`cat-desc-${category.id}`} value={description} placeholder="Short description (optional)" maxLength={300} onChange={(e) => setDescription(e.target.value)} onBlur={() => description.trim() !== (category.description ?? '') && saveCategory({ description: description.trim() || null })} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="sr-only" htmlFor={`cat-icon-${category.id}`}>
            Icon
          </label>
          <Select id={`cat-icon-${category.id}`} className="w-32" value={category.icon} onChange={(e) => saveCategory({ icon: e.target.value })}>
            {ICONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
          <Switch id={`cat-vis-${category.id}`} label="Visible" checked={category.isVisible} onChange={(v) => saveCategory({ isVisible: v })} />
          <MoveButtons name={category.name} index={index} count={count} disabled={busy} onMove={onMove} />
          <IconButton label={`Delete category ${category.name}`} className="hover:border-danger hover:text-danger" onClick={() => void removeCategory()}>
            <Trash2 className="size-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>

      <ul className="mt-5 space-y-2 border-t border-line pt-5">
        {category.skills.length === 0 && <li className="text-sm text-muted">No skills in this category yet.</li>}
        {category.skills.map((s, i) => (
          <SkillRow key={s.id} skill={s} index={i} count={category.skills.length} busy={busy} onMove={(d) => run(() => adminApi.reorderSkills(moveItem(category.skills, i, d).map((x) => x.id)))} run={run} />
        ))}
      </ul>

      <form onSubmit={addSkill} className="mt-4 flex gap-2" aria-label={`Add skill to ${category.name}`}>
        <label htmlFor={`new-skill-${category.id}`} className="sr-only">
          New skill
        </label>
        <Input id={`new-skill-${category.id}`} placeholder="Add a skill, e.g. TypeScript" value={newSkill} maxLength={80} onChange={(e) => setNewSkill(e.target.value)} />
        <Button type="submit" variant="secondary" size="md" disabled={!newSkill.trim() || busy}>
          Add
        </Button>
      </form>
    </Card>
  );
}

function SkillRow({ skill, index, count, busy, onMove, run }: { skill: SkillCategoryAdmin['skills'][number]; index: number; count: number; busy: boolean; onMove: (d: -1 | 1) => void; run: (fn: () => Promise<unknown>, successMessage?: string) => void }) {
  const [name, setName] = useState(skill.name);
  const [note, setNote] = useState(skill.note ?? '');
  const base = { categoryId: skill.categoryId, name: skill.name, note: skill.note, isVisible: skill.isVisible };
  const save = (patch: Partial<typeof base>) => run(() => adminApi.updateSkill(skill.id, { ...base, ...patch }));

  return (
    <li className="flex flex-wrap items-center gap-2">
      <div className="grid min-w-0 flex-1 basis-60 grid-cols-[1.4fr_1fr] gap-2">
        <Input aria-label={`Skill name: ${skill.name}`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name.trim() !== skill.name && save({ name: name.trim() })} />
        <Input aria-label={`Note for ${skill.name}`} value={note} placeholder="Note (optional)" maxLength={80} onChange={(e) => setNote(e.target.value)} onBlur={() => note.trim() !== (skill.note ?? '') && save({ note: note.trim() || null })} />
      </div>
      <Switch id={`skill-vis-${skill.id}`} label={`Visible: ${skill.name}`} checked={skill.isVisible} onChange={(v) => save({ isVisible: v })} />
      <MoveButtons name={skill.name} index={index} count={count} disabled={busy} onMove={onMove} />
      <IconButton label={`Delete ${skill.name}`} className="hover:border-danger hover:text-danger" onClick={() => run(() => adminApi.deleteSkill(skill.id), 'Skill deleted.')}>
        <Trash2 className="size-4" aria-hidden="true" />
      </IconButton>
    </li>
  );
}
