'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface ProgressEvent {
  type: 'progress' | 'complete' | 'error';
  done?: number;
  total?: number;
  currentFile?: string;
  summary?: {
    total: number;
    successful: number;
    failed: number;
    errors: { url: string; error: string }[];
  };
  message?: string;
}

export default function BulkImportUrls() {
  const [urls, setUrls] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, currentFile: '' });
  const [summary, setSummary] = useState<ProgressEvent['summary'] | null>(null);

  const startImport = async () => {
    const lines = urls.split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      toast.error('Paste at least one URL');
      return;
    }
    setRunning(true);
    setProgress({ done: 0, total: lines.length, currentFile: '' });
    setSummary(null);

    try {
      const response = await fetch('/api/bulk-import-urls', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ADMIN_TOKEN || ''}`
        },
        body: JSON.stringify({ urls: lines }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Unauthorized: Please log in as admin');
        } else {
          toast.error(`Error: ${response.statusText}`);
        }
        setRunning(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data: ProgressEvent = JSON.parse(line.slice(6));
            
            if (data.type === 'progress') {
              setProgress({ done: data.done!, total: data.total!, currentFile: data.currentFile || '' });
            } else if (data.type === 'complete') {
              setSummary(data.summary!);
              toast.success(`Imported ${data.summary!.successful} / ${data.summary!.total}`);
              setRunning(false);
              return;
            } else if (data.type === 'error') {
              toast.error(data.message || 'Import failed');
              setRunning(false);
              return;
            }
          }
        }
      }
    } catch (error) {
      toast.error('Connection failed');
      setRunning(false);
    }
  };

  const downloadCsv = () => {
    if (!summary) return;
    const rows = ['URL,Error'];
    summary.errors.forEach((e) => rows.push(`"${e.url}","${e.error}"`));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-import-errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Import from URLs</CardTitle>
        <CardDescription>Paste public PDF/DOCX URLs (one per line). Optional: append "|customFileName"</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Textarea
          placeholder={`https://example.com/resume1.pdf
https://example.com/resume2.docx|John Doe CV
...`}
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          disabled={running}
          rows={8}
        />
        <div className="flex items-center gap-2">
          <Button onClick={startImport} disabled={running}>
            {running ? 'Importing…' : 'Start Import'}
          </Button>
          {summary && (
            <Button variant="outline" size="sm" onClick={downloadCsv}>
              Download errors CSV
            </Button>
          )}
        </div>
        {running && (
          <div className="space-y-2">
            <Progress value={(progress.done / progress.total) * 100} />
            <p className="text-sm text-muted-foreground">
              {progress.done} / {progress.total} – {progress.currentFile}
            </p>
          </div>
        )}
        {summary && (
          <div className="text-sm">
            <p className="font-medium">Done: {summary.successful} successful, {summary.failed} failed</p>
            {summary.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-600">{summary.errors.length} errors</summary>
                <ul className="list-disc ml-6 mt-1 space-y-1">
                  {summary.errors.map((e, i) => (
                    <li key={i}>
                      <span className="break-all">{e.url}</span>: <span className="text-red-500">{e.error}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}