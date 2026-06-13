import { router } from '@inertiajs/react';
import {
  User, Settings, RefreshCw, LogOut, ChevronRight, BarChart2,
  DollarSign, FlaskConical, Wheat, Activity, MessageSquare,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function MoreIndex() {
  const { user, farm, isManager } = useAuth();
  const { isOnline, pendingCount } = useNetworkStatus();

  const sections = [
    {
      title: 'Modules',
      items: [
        { label: 'Analytics', icon: BarChart2, href: '/analytics', badge: null },
        { label: 'Finance / P&L', icon: DollarSign, href: '/finance', badge: null, managerOnly: true },
        { label: 'Feed Formulation', icon: FlaskConical, href: '/formulation', badge: null, managerOnly: true },
        { label: 'Feed Inventory', icon: Wheat, href: '/feed', badge: null },
        { label: 'Calf Growth', icon: Activity, href: '/calves', badge: null },
        { label: 'WhatsApp Reports', icon: MessageSquare, href: '/analytics/whatsapp/daily', badge: null },
      ],
    },
    {
      title: 'Settings',
      items: [
        { label: 'My Profile', icon: User, href: '/profile', badge: null },
        { label: 'Farm Settings', icon: Settings, href: '/settings/farm', badge: null, managerOnly: true },
        { label: 'Sync Status', icon: RefreshCw, href: '/settings/sync', badge: pendingCount > 0 ? String(pendingCount) : null },
      ],
    },
  ];

  return (
    <AppLayout title="More">
      <div className="px-4 py-4 space-y-4">
        <div className="bg-primary-900 rounded-xl p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
            {user?.name?.slice(0, 1) ?? 'U'}
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold">{user?.name}</p>
            <p className="text-primary-300 text-sm">{farm?.name}</p>
          </div>
          <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} title={isOnline ? 'Online' : 'Offline'} />
        </div>

        {sections.map(section => (
          <div key={section.title}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">{section.title}</p>
            <div className="bg-white rounded-xl divide-y divide-gray-100">
              {section.items.filter(item => !item.managerOnly || isManager).map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.href}
                    onClick={() => router.visit(item.href)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-sm font-medium text-gray-700">{item.label}</span>
                    {item.badge && (
                      <span className="h-5 min-w-5 px-1 bg-amber-500 text-white text-xs rounded-full flex items-center justify-center font-bold mr-1">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div>
          <button
            onClick={() => router.post('/logout')}
            className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-xl text-left hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium text-red-600">Log Out</span>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          SpinoMok FarmOps v1.0 / Operational build
        </p>
      </div>
    </AppLayout>
  );
}
