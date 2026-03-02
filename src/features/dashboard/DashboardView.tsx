import React from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewView } from './views/OverviewView';
import { SalesView } from './views/SalesView';
import { ExpensesView } from './views/ExpensesView';
import { PurchasesView } from './views/PurchasesView';

const DashboardView: React.FC = () => {
  const [currentView, setCurrentView] = React.useState<'overview' | 'sales' | 'expenses' | 'purchases'>('overview');
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView selectedDate={selectedDate} />;
      case 'sales':
        return <SalesView selectedDate={selectedDate} />;
      case 'expenses':
        return <ExpensesView selectedDate={selectedDate} />;
      case 'purchases':
        return <PurchasesView selectedDate={selectedDate} />;
      default:
        return <OverviewView selectedDate={selectedDate} />;
    }
  };

  return (
    <DashboardLayout
      currentView={currentView as any}
      onViewChange={setCurrentView as any}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default DashboardView;
