import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Platform } from 'react-native';

import { Button, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase';
import type { Report } from './api';
import { buildReportHtml } from './reportHtml';

/**
 * Builds the client-facing PDF on the device. When a report manager does it, the file is also
 * stored with the report so the admin panel and the client can download the same document.
 * On web: opens the HTML report in a new tab for browser printing.
 */
export function ReportPdfButton({ report }: { report: Report }) {
  const { can, appInterface } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const store = appInterface !== 'client' && can('reports.manage');

  const run = async () => {
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        // Web: open HTML in a new tab; user can Cmd+P / Ctrl+P to print/save as PDF.
        const html = buildReportHtml(report);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Store the report path via Supabase if manager
        if (store) {
          const supabase = getSupabase();
          await supabase.from('monthly_reports').update({ pdf_generated_at: new Date().toISOString() }).eq('id', report.id);
          queryClient.invalidateQueries({ queryKey: ['reports'] });
        }
        toast.show('Hisobot yangi tabda ochildi');
        return;
      }

      // Native: use expo-print + expo-sharing
      const { File, Paths } = await import('expo-file-system');
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');

      // A4 in points; iOS ignores CSS @page margins, so they are set here.
      const printed = await Print.printToFileAsync({ html: buildReportHtml(report), width: 595, height: 842, margins: { left: 40, right: 40, top: 44, bottom: 44 } });
      const name = `SUNMEDIA-${report.client.code}-${report.period_month.slice(0, 7)}.pdf`;
      // A readable file name for whoever receives it.
      const named = new File(Paths.cache, name);
      if (named.exists) named.delete();
      new File(printed.uri).move(named);
      const uri = named.uri;
      if (store) {
        const path = `${report.client.id}/${report.id}.pdf`;
        const bytes = await new File(uri).bytes();
        const supabase = getSupabase();
        const { error } = await supabase.storage.from('reports').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
        if (error) throw error;
        const { error: saveError } = await supabase.from('monthly_reports').update({ pdf_path: path, pdf_generated_at: new Date().toISOString() }).eq('id', report.id);
        if (saveError) throw saveError;
        queryClient.invalidateQueries({ queryKey: ['reports'] });
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
      } else {
        toast.show('PDF tayyor');
      }
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return <Button title="PDF" icon="download" variant="secondary" size="md" fullWidth={false} loading={busy} onPress={run} />;
}
