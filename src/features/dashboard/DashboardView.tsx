import React from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { OverviewView } from './views/OverviewView';
import { SalesView } from './views/SalesView';
import { BudgetsView } from './views/BudgetsView';
import { ProjectionsView } from './views/ProjectionsView';
import { ExpensesView } from './views/ExpensesView';

const DashboardView: React.FC = () => {
  const [currentView, setCurrentView] = React.useState<'overview' | 'sales' | 'budget' | 'projections' | 'expenses'>('overview');
  const [selectedDate, setSelectedDate] = React.useState(new Date());

  const renderContent = () => {
    switch (currentView) {
      case 'overview':
        return <OverviewView selectedDate={selectedDate} />;
      case 'sales':
        return <SalesView selectedDate={selectedDate} />;
      case 'budget':
        return <BudgetsView selectedDate={selectedDate} />;
      case 'projections':
        return <ProjectionsView selectedDate={selectedDate} />;
      case 'expenses':
        return <ExpensesView selectedDate={selectedDate} />;
      default:
        return <OverviewView selectedDate={selectedDate} />;
    }
  };

  return (
    <DashboardLayout
      currentView={currentView}
      onViewChange={setCurrentView}
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

export default DashboardView;
