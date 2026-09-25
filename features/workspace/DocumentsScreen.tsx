import { useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';

import { Chip, ChipRow, EmptyState, HeaderButton, ListGroup, ListRow, QueryView, Screen, SearchField, Section, useToast } from '@/components/ui';
import { DOCUMENT_CATEGORY } from '@/constants/labels';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDateShort } from '@/lib/time';
import { fetchSharedDocuments, type DocumentCategory, type SharedDocument } from './api';
import { DocumentForm } from './components/DocumentForm';

/** Company documents: SOPs, guides, brand assets, policies and templates for all staff. */
export function DocumentsScreen() {
  const { can } = useAuth();
  const toast = useToast();
  const [creating, setCreating] = useState(false);
  const [category, setCategory] = useState<DocumentCategory | null>(null);
  const [q, setQ] = useState('');
  const query = useQuery({ queryKey: ['workspace', 'documents'], queryFn: fetchSharedDocuments });

  const open = async (doc: SharedDocument) => {
    if (!doc.url) return toast.show('Fayl hali yuklanmagan', 'info');
    try {
      await WebBrowser.openBrowserAsync(doc.url);
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Screen edges={[]} refreshing={query.isRefetching} onRefresh={() => query.refetch()}>
      <Stack.Screen
        options={{
          title: 'Hujjatlar va SOP',
          headerRight: can('workspace.manage') ? () => <HeaderButton icon="plus" label="Yangi hujjat" onPress={() => setCreating(true)} /> : undefined,
        }}
      />
      <SearchField value={q} onChangeText={setQ} placeholder="Hujjat nomi" />
      <ChipRow>
        <Chip label="Barchasi" selected={!category} onPress={() => setCategory(null)} />
        {Object.entries(DOCUMENT_CATEGORY).map(([key, meta]) => (
          <Chip key={key} label={meta.label} icon={meta.icon} selected={category === key} onPress={() => setCategory(key as DocumentCategory)} />
        ))}
      </ChipRow>
      <QueryView
        query={query}
        isEmpty={(d) => d.length === 0}
        empty={{ icon: 'book-open', title: 'Hali hujjat yo‘q', description: 'SOP, qo‘llanma va brend fayllari shu yerda jamlanadi.' }}
      >
        {(docs) => <Grouped docs={docs} category={category} q={q} onOpen={open} />}
      </QueryView>
      <DocumentForm visible={creating} onClose={() => setCreating(false)} />
    </Screen>
  );
}

function Grouped({ docs, category, q, onOpen }: { docs: SharedDocument[]; category: DocumentCategory | null; q: string; onOpen: (d: SharedDocument) => void }) {
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return docs.filter((d) => (!category || d.category === category) && (!term || `${d.title} ${d.description ?? ''}`.toLowerCase().includes(term)));
  }, [docs, category, q]);
  const groups = Object.keys(DOCUMENT_CATEGORY)
    .map((key) => ({ key: key as DocumentCategory, items: filtered.filter((d) => d.category === key) }))
    .filter((g) => g.items.length > 0);
  if (groups.length === 0) return <EmptyState icon="search" title="Mos hujjat topilmadi" description="Qidiruv yoki toifani o‘zgartirib ko‘ring." />;
  return (
    <>
      {groups.map((g) => (
        <Section key={g.key} title={DOCUMENT_CATEGORY[g.key].label}>
          <ListGroup>
            {g.items.map((d) => (
              <ListRow
                key={d.id}
                icon={d.is_pinned ? 'bookmark' : DOCUMENT_CATEGORY[g.key].icon}
                iconTone={d.is_pinned ? 'brand' : 'neutral'}
                title={d.title}
                subtitle={[d.description, `yangilangan ${formatDateShort(d.updated_at)}`].filter(Boolean).join(' · ')}
                onPress={() => onOpen(d)}
              />
            ))}
          </ListGroup>
        </Section>
      ))}
    </>
  );
}
