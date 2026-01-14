'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ledgerApi, referralApi, flowApi } from '@/lib/api';

export default function Dashboard() {
  const router = useRouter();
  const [balance, setBalance] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [balanceRes, statsRes, flowsRes] = await Promise.all([
        ledgerApi.getBalance(),
        referralApi.getStats(),
        flowApi.listFlows(),
      ]);

      setBalance(balanceRes.data);
      setReferralStats(statsRes.data);
      setFlows(flowsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold">Referral Management System</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Balance Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Account Balance</h2>
            {balance.map((account) => (
              <div key={account.id} className="mb-2">
                <p className="text-sm text-gray-600">{account.name}</p>
                <p className="text-2xl font-bold">
                  {account.currency} {Number(account.balance).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          {/* Referral Stats Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Referral Stats</h2>
            {referralStats && (
              <>
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Total Referrals</p>
                  <p className="text-2xl font-bold">{referralStats.totalReferred}</p>
                </div>
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-xl">{referralStats.completedReferred}</p>
                </div>
                <div className="mb-2">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-xl">{referralStats.pendingReferred}</p>
                </div>
              </>
            )}
          </div>

          {/* Flows Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Flows</h2>
            <p className="text-2xl font-bold mb-4">{flows.length} Total</p>
            <button
              onClick={() => router.push('/flow-builder')}
              className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              Create New Flow
            </button>
          </div>
        </div>

        {/* Flows List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Your Flows</h2>
          {flows.length === 0 ? (
            <p className="text-gray-600">No flows yet. Create your first flow!</p>
          ) : (
            <div className="space-y-4">
              {flows.map((flow) => (
                <div key={flow.id} className="border rounded p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{flow.name}</h3>
                      {flow.description && (
                        <p className="text-sm text-gray-600">{flow.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Created: {new Date(flow.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        flow.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {flow.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
