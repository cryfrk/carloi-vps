'use client';

import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

import { createPost, refreshBootstrapAfterMutation, uploadFiles } from '@/lib/api-helpers';
import {
  buildListingDraftPayload,
  buildVehicleSubtitle,
  buildVehicleTitle,
  createEmptyPaintMap,
  getVehicleListingReadiness,
} from '@/lib/vehicle';
import { toAppError } from '@/lib/errors';
import { extractGarageVehicles, getPrimaryGarageVehicle } from '@/lib/snapshot';
import { useSessionStore } from '@/store/session-store';
import { useUiStore } from '@/store/ui-store';
import { StateBlock } from '@/components/state-block';
import { SectionTabs } from '@/components/section-tabs';

type CreateMode = 'normal' | 'vehicle' | 'listing';

export function CreateComposerModal() {
  const close = useUiStore((state) => state.closeCreateModal);
  const createMode = useUiStore((state) => state.createMode);
  const snapshot = useSessionStore((state) => state.snapshot);
  const refreshSnapshot = useSessionStore((state) => state.refreshSnapshot);

  const [mode, setMode] = useState<CreateMode>(createMode);
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(getPrimaryGarageVehicle(snapshot)?.id || '');
  const [visibility, setVisibility] = useState<'vehicle-only' | 'profile-and-vehicle' | 'feed-profile-and-vehicle'>(
    'feed-profile-and-vehicle',
  );
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [location, setLocation] = useState('');
  const [relationType, setRelationType] = useState<'owner' | 'authorized_business' | 'other_authorized'>('owner');
  const [authorizationText, setAuthorizationText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; description: string } | null>(null);

  const vehicles = extractGarageVehicles(snapshot);
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId) || vehicles[0] || null;
  const listingReadiness = selectedVehicle
    ? getVehicleListingReadiness({
        selection: {},
        ownershipBasis: 'registered-owner',
        plateVisibility: selectedVehicle.plateIsHidden ? 'masked' : 'full',
        equipment: {
          selectedPackageSlugs: [],
          customEntries: selectedVehicle.equipment,
          confirmed: selectedVehicle.equipment.length > 0,
        },
        paintAssessment: {
          map: (selectedVehicle.paintMap as never) || createEmptyPaintMap(),
          confirmed: Boolean(selectedVehicle.paintMap),
        },
        photos: selectedVehicle.media.map((item) => ({
          id: item.id,
          url: item.url,
          type: item.kind === 'video' ? 'video' : 'image',
          label: item.fileName,
        })),
        visibilityScope: selectedVehicle.showInProfile ? 'profile' : 'garage',
        mileageKm: selectedVehicle.mileageKm || undefined,
        colorName: selectedVehicle.color,
        plateNumber: selectedVehicle.plate,
        registration: selectedVehicle.registration
          ? {
              ownerName: selectedVehicle.registration.ownerName,
              registrationCity: selectedVehicle.registration.registrationCity,
            }
          : undefined,
        chassisNumber: selectedVehicle.chassis?.chassisNo,
      })
    : null;

  const filePreviews = useMemo(
    () => files.map((file) => ({ name: file.name, size: Math.round(file.size / 1024) })),
    [files],
  );

  async function handleSubmit() {
    setBusy(true);
    setError(null);

    try {
      const uploaded = files.length ? await uploadFiles(files) : [];
      const payload: Record<string, unknown> =
        mode === 'listing'
          ? {
              postType: 'listing',
              content,
              media: uploaded,
              listingDraft: buildListingDraftPayload(selectedVehicle!, {
                title: title || 'Carloi ilani',
                price,
                description: content,
                city,
                district,
                location,
                phone: snapshot?.settings?.phone || snapshot?.auth.phone || '',
                relationType,
                authorizationText,
              }),
            }
          : {
              content,
              media: uploaded,
              hashtags:
                mode === 'vehicle' && selectedVehicle
                  ? [`garage:${selectedVehicle.id}`, `visibility:${visibility}`]
                  : [],
            };

      await createPost(payload);
      await refreshBootstrapAfterMutation(refreshSnapshot);
      close();
    } catch (caughtError) {
      setError(toAppError(caughtError, 'Icerik yayinlanamadi'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[36px] border border-white/70 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-slate-950">Yeni icerik olustur</h3>
            <p className="mt-1 text-sm text-slate-500">Gonderi, arac paylasimi veya profesyonel ilan olustur.</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-[74vh] space-y-6 overflow-y-auto px-6 py-6">
          <SectionTabs
            value={mode}
            onChange={setMode}
            options={[
              { label: 'Gonderi', value: 'normal' },
              { label: 'Arac gonderisi', value: 'vehicle' },
              { label: 'Ilan', value: 'listing' },
            ]}
          />

          <section className="space-y-3">
            <label className="text-sm font-semibold text-slate-700" htmlFor="create-content">
              Aciklama
            </label>
            <textarea
              id="create-content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder={mode === 'listing' ? 'Ilan aciklamasini yaz' : 'Akista ne paylasmak istiyorsun?'}
              className="min-h-[150px] w-full rounded-[26px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
            />
          </section>

          {(mode === 'vehicle' || mode === 'listing') ? (
            <section className="space-y-3">
              <div className="text-sm font-semibold text-slate-700">Garajdan arac sec</div>
              {vehicles.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {vehicles.map((vehicle) => {
                    const active = vehicle.id === selectedVehicleId;
                    return (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => setSelectedVehicleId(vehicle.id)}
                        className={`rounded-[26px] border p-4 text-left transition ${
                          active
                            ? 'border-cyan-300 bg-cyan-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="font-semibold text-slate-950">{buildVehicleTitle(vehicle) || 'Arac'}</div>
                        <div className="mt-1 text-sm text-slate-500">{buildVehicleSubtitle(vehicle) || 'Garaj araci'}</div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <StateBlock
                  title="Once Garajim alanina arac ekle"
                  description="Arac gonderisi ve ilan olusturma icin V3 Garajim alaninda en az bir arac olmali."
                />
              )}
            </section>
          ) : null}

          {mode === 'vehicle' ? (
            <section className="space-y-3">
              <div className="text-sm font-semibold text-slate-700">Gorunurluk</div>
              <SectionTabs
                value={visibility}
                onChange={setVisibility}
                options={[
                  { label: 'Sadece arac', value: 'vehicle-only' },
                  { label: 'Profil + arac', value: 'profile-and-vehicle' },
                  { label: 'Ana akis + profil + arac', value: 'feed-profile-and-vehicle' },
                ]}
              />
            </section>
          ) : null}

          {mode === 'listing' ? (
            <section className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Ilan basligi</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="field-input" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Fiyat</span>
                <input value={price} onChange={(e) => setPrice(e.target.value)} className="field-input" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Sehir</span>
                <input value={city} onChange={(e) => setCity(e.target.value)} className="field-input" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Ilce</span>
                <input value={district} onChange={(e) => setDistrict(e.target.value)} className="field-input" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Konum</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="field-input" />
              </label>
              <div className="space-y-3 md:col-span-2">
                <div className="text-sm font-semibold text-slate-700">Arac iliskisi</div>
                <SectionTabs
                  value={relationType}
                  onChange={setRelationType}
                  options={[
                    { label: 'Ruhsat sahibi', value: 'owner' },
                    { label: 'Yetkili isletme', value: 'authorized_business' },
                    { label: 'Diger yetkili', value: 'other_authorized' },
                  ]}
                />
                {relationType !== 'owner' ? (
                  <textarea
                    value={authorizationText}
                    onChange={(event) => setAuthorizationText(event.target.value)}
                    placeholder="Yetki ve sorumluluk aciklamasi"
                    className="min-h-[100px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-cyan-300 focus:bg-white"
                  />
                ) : null}
                <StateBlock
                  title="Mevzuat ve hesap uyarisi"
                  description="Iletisim bilgisi yalnizca Carloi hesabindaki e-posta ve telefon bilgisinden gelir. Farkli kisinin araci satiliyorsa yetki ve e-Devlet dogrulama sorumlulugu ilan veren kullanicidadir."
                />
                {listingReadiness && !listingReadiness.ready ? (
                  <StateBlock
                    title="Arac ilana tam hazir degil"
                    description={`Eksik alanlar: ${listingReadiness.missingFields.join(', ')}`}
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <div className="text-sm font-semibold text-slate-700">Medya</div>
            <label className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-cyan-300 hover:bg-cyan-50/40">
              <span className="text-sm font-semibold text-slate-800">Foto veya video ekle</span>
              <span className="mt-2 text-xs leading-5 text-slate-500">PNG, JPG, MP4. Yukleme oncesi guvenli sekilde hazirlanir.</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                className="hidden"
                onChange={(event) => setFiles(Array.from(event.target.files || []))}
              />
            </label>
            {filePreviews.length ? (
              <div className="grid gap-2 md:grid-cols-2">
                {filePreviews.map((item) => (
                  <div key={item.name} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    {item.name} • {item.size} KB
                  </div>
                ))}
              </div>
            ) : null}
          </section>

          {error ? <StateBlock title={error.title} description={error.description} /> : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-slate-500">
            Gonderi, arac gonderisi ve ilan turleri dogrudan canli API ile olusturulur.
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Vazgec
            </button>
            <button
              type="button"
              disabled={busy || !content.trim() || ((mode === 'vehicle' || mode === 'listing') && !selectedVehicle)}
              onClick={() => void handleSubmit()}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {busy ? 'Yayinlaniyor...' : mode === 'listing' ? 'Ilani yayinla' : 'Paylas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
