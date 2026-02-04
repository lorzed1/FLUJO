---
description: Implementation plan for Transfers and Nequi database and view in Reconciliation
---

# Implementation Plan: Nequi and Transfers Module

## 1. Analysis
- **Goal**: Create a separate data store for "Transferencias" and "Nequi" records and add a view for them in the Reconciliation (Arqueo) module.
- **Impacted Files**:
    - `src/types/index.ts`: Add `TransferRecord` interface.
    - `src/services/firestore.ts`: Add methods to interact with the new `transferencias` collection.
    - `src/features/reconciliation/ConciliacionesView.tsx`: Add the new tab and integrate the view.
    - `src/features/reconciliation/TransfersView.tsx`: New component.
- **Data Structure**:
    - Collection: `transferencias`
    - Fields: `id`, `date`, `amount`, `type` (Nequi/Transferencia), `description`, `reference`, `createdAt`.

## 2. Proposed Changes

### A. Types (`src/types/index.ts`)
Add `TransferRecord` interface:
```typescript
export type TransferType = 'nequi' | 'bancolombia' | 'davivienda' | 'otros';

export interface TransferRecord {
  id: string;
  date: string;
  amount: number;
  type: TransferType;
  description: string;
  reference?: string; // Comprobante #
  createdAt: string;
}
```

### B. Service (`src/services/firestore.ts`)
Add methods to `FirestoreService`:
- `saveTransfer(record: TransferRecord)`
- `getTransfers()`
- `deleteTransfer(id: string)`
- `updateTransfer(id: string, updates: Partial<TransferRecord>)`

### C. Component (`src/features/reconciliation/TransfersView.tsx`)
Create a new component with:
- **Input Form**: Date, Amount, Type (Select), Description, Reference.
- **Table**: List of recent transfers with delete/edit actions.
- **Summary**: Total amount for the selected period/day (optional but useful).

### D. Main View (`src/features/reconciliation/ConciliacionesView.tsx`)
- Add a state for the active tab (already exists, just add 'transfers').
- Add the button in the navigation.
- Render `TransfersView` when tab is active.

## 3. detailed Steps
1.  Define types in `src/types/index.ts`.
2.  Implement Firestore methods in `src/services/firestore.ts`.
3.  Create `src/features/reconciliation/TransfersView.tsx`.
4.  Modify `src/features/reconciliation/ConciliacionesView.tsx` to include the new tab.
