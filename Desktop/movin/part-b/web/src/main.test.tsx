import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { App } from './main';

beforeEach(() => {
  localStorage.clear();
  vi.useRealTimers();
  vi.stubGlobal('crypto', { randomUUID: () => `profile-${Math.random()}` });
});

describe('MOVIN web flow', () => {
  it('requires profile details before showing inventory', async () => {
    render(<App />);
    await new Promise(resolve => setTimeout(resolve, 750));
    expect(screen.getByText('Antes de revisar el inventario')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Número de almacén'), { target: { value: 'ALM-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y revisar inventario' }));
    expect(await screen.findByText('Revisa tu inventario')).toBeTruthy();
  });

  it('persists edited inventory per profile and restores it', async () => {
    localStorage.setItem('movin.profiles', JSON.stringify({ version: 1, activeProfileId: 'p1', profiles: [{ id: 'p1', name: 'Ana', warehouseNumber: 'ALM-1', avatarDataUrl: '' }] }));
    render(<App />);
    await new Promise(resolve => setTimeout(resolve, 750));
    const quantities = await screen.findAllByLabelText('Cantidad de Estantería');
    fireEvent.change(quantities[0], { target: { value: '4' } });
    await waitFor(() => expect(JSON.parse(localStorage.getItem('movin.inventories') || '{}').inventories.p1).toBeTruthy());
    expect(screen.getByDisplayValue('4')).toBeTruthy();
  });
});
