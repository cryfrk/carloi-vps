'use client';

import { Gauge, ShieldCheck, Sparkles } from 'lucide-react';

import { safeDateLabel } from '@/lib/date';
import { buildVehicleSubtitle, buildVehicleTitle } from '@/lib/vehicle';
import type { GarageVehicleRecord } from '@/types/app';

interface VehicleCardProps {
  vehicle: GarageVehicleRecord;
  onClick?: () => void;
}

export function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  const cover = vehicle.media.find((item) => item.kind === 'photo')?.url || vehicle.media[0]?.url;
  const className =
    'w-full overflow-hidden rounded-[28px] border border-slate-200 bg-white text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-xl';

  const content = (
    <>
      <div className="relative">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={buildVehicleTitle(vehicle)} className="aspect-[16/10] w-full object-cover" />
        ) : (
          <div className="aspect-[16/10] w-full bg-gradient-to-br from-cyan-50 via-slate-100 to-white" />
        )}
        <div className="absolute left-4 top-4 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold text-slate-700 backdrop-blur">
          {vehicle.vehicleType}
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="space-y-1">
          <div className="text-lg font-semibold text-slate-950">{buildVehicleTitle(vehicle)}</div>
          <div className="text-sm text-slate-500">{buildVehicleSubtitle(vehicle) || 'Garaj profili hazir'}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Plaka</div>
            <div className="mt-1 font-medium text-slate-800">{vehicle.plateDisplay || 'Gizli'}</div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-400">KM</div>
            <div className="mt-1 font-medium text-slate-800">
              {vehicle.mileageKm != null ? `${vehicle.mileageKm.toLocaleString('tr-TR')} km` : 'Bilinmiyor'}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <Gauge className="size-3.5" />
            Saglik {vehicle.latestExpertiseReport?.healthScore ?? vehicle.healthScore ?? '-'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">
            <Sparkles className="size-3.5" />
            OBD {vehicle.obdConnectionStatus === 'connected' ? 'Bagli' : 'Hazir'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
            <ShieldCheck className="size-3.5" />
            {safeDateLabel(vehicle.updatedAt || vehicle.createdAt)}
          </span>
        </div>
      </div>
    </>
  );

  if (!onClick) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
