import React from 'react';
import DemoScreen from '../components/DemoScreen';
import { useRouter } from '../context/RouteContext';

export default function DemoView({ onRefreshGlobalData }) {
  const { navigate } = useRouter();

  return (
    <div className="py-2">
      <DemoScreen
        onFinishDemo={() => navigate('/dashboard')}
        onRefreshGlobalData={onRefreshGlobalData}
      />
    </div>
  );
}
