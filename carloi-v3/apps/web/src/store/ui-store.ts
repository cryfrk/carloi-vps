'use client';

import { create } from 'zustand';

type CreateMode = 'normal' | 'vehicle' | 'listing';

interface UiState {
  createModalOpen: boolean;
  createMode: CreateMode;
  openCreateModal: (mode?: CreateMode) => void;
  closeCreateModal: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  createModalOpen: false,
  createMode: 'normal',
  openCreateModal(mode = 'normal') {
    set({
      createModalOpen: true,
      createMode: mode,
    });
  },
  closeCreateModal() {
    set({
      createModalOpen: false,
    });
  },
}));
