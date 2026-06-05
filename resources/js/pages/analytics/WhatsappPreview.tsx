import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ArrowLeft, Copy, MessageSquare } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import type { PageProps } from '@/types';
import { formatDate } from '@/utils/format';

interface WhatsappProps extends PageProps {
  message: string;
  date: string;
  type: 'daily' | 'weekly' | 'monthly';
}

export default function WhatsappPreview() {
  const { message, date, type } = usePage<WhatsappProps>().props;
  const [editedMessage, setEditedMessage] = useState(message);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const shareLink = `https://wa.me/?text=${encodeURIComponent(editedMessage)}`;
  const typeLabel = { daily: 'Daily Report', weekly: 'Weekly Summary', monthly: 'Monthly Summary' }[type];

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(editedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppLayout title="WhatsApp Preview" showBottomNav={false}>
      <div className="bg-primary-900 pt-safe-top px-4 pb-4">
        <div className="flex items-center gap-3 pt-3">
          <button onClick={() => router.visit('/analytics')} className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-white text-lg font-bold">WhatsApp Preview</h1>
            <p className="text-primary-300 text-xs">{typeLabel} / {formatDate(date)}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2">
          {[
            { type: 'daily', label: 'Daily', href: '/analytics/whatsapp/daily' },
            { type: 'weekly', label: 'Weekly', href: '/analytics/whatsapp/weekly' },
          ].map(item => (
            <button key={item.type} onClick={() => router.visit(item.href)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all ${
                type === item.type ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'
              }`}>
              {item.label}
            </button>
          ))}
        </div>

        <div className="bg-[#ECE5DD] rounded-2xl p-4 min-h-[200px]">
          <div className="flex justify-end">
            <div className="bg-[#DCF8C6] rounded-2xl rounded-br-sm px-4 py-3 max-w-[90%] shadow-sm">
              {editing ? (
                <textarea
                  value={editedMessage}
                  onChange={event => setEditedMessage(event.target.value)}
                  rows={editedMessage.split('\n').length + 2}
                  className="w-full bg-transparent text-sm text-gray-900 focus:outline-none resize-none font-[system-ui] leading-relaxed"
                />
              ) : (
                <pre className="text-sm text-gray-900 whitespace-pre-wrap font-[system-ui] leading-relaxed">{editedMessage}</pre>
              )}
              <p className="text-right text-[10px] text-gray-400 mt-1">
                {new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{editedMessage.length} characters</span>
          <span>{editedMessage.split('\n').length} lines</span>
        </div>

        <div className="space-y-3">
          <a href={shareLink} target="_blank" rel="noopener noreferrer" className="block">
            <Button fullWidth size="lg" className="bg-[#25D366] hover:bg-[#20BD5A]" leftIcon={<MessageSquare className="h-5 w-5" />}>
              Share via WhatsApp
            </Button>
          </a>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditing(!editing)} className="flex-1">
              {editing ? 'Done Editing' : 'Edit Message'}
            </Button>
            <Button variant="secondary" onClick={copyToClipboard} className="flex-1" leftIcon={<Copy className="h-4 w-4" />}>
              {copied ? 'Copied!' : 'Copy Text'}
            </Button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Send To</p>
          <div className="space-y-2">
            {[
              { label: 'Farm Owner', desc: 'Daily reports and all alerts' },
              { label: 'Farm Manager', desc: 'Submitted daily reports' },
              { label: 'Shareholders', desc: 'Weekly and monthly summaries' },
              { label: 'Veterinarian', desc: 'Health and vaccination alerts' },
            ].map(recipient => (
              <div key={recipient.label} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{recipient.label}</p>
                  <p className="text-xs text-gray-400">{recipient.desc}</p>
                </div>
                <a href={shareLink} target="_blank" rel="noopener noreferrer" className="h-8 px-3 bg-[#25D366] text-white rounded-full text-xs font-medium flex items-center">
                  Send
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-sm font-bold text-green-900 mb-1">Manual WhatsApp Sharing</p>
          <p className="text-xs text-green-700">Use the send buttons above to share the prepared report through WhatsApp. The message can be edited before sending.</p>
        </div>
      </div>
    </AppLayout>
  );
}
