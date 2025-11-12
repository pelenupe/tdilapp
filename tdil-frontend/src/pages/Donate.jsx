import { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import PageLayout from '../components/PageLayout';
import PointsService from '../services/pointsService';

export default function Donate() {
  const { user } = useUser();

  const handleDonation = (amount) => {
    // Award points for donation
    PointsService.awardPoints('DONATION', `Made a donation of $${amount}`, {
      amount
    });
    alert(`Thank you for your donation of $${amount}! +100 points earned!`);
  };

  return (
    <PageLayout
      userType={user?.userType || 'member'}
      title="Support Our Mission"
      subtitle="Your donation helps us continue to provide valuable resources and networking opportunities"
      showPointsInHeader={true}
      userPoints={user?.points || 0}
    >
      <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Donate</h1>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-3xl">❤️</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">Support Our Mission</h2>
              <p className="text-gray-600 max-w-2xl mx-auto">
                Your donation helps us continue to provide valuable resources, networking opportunities, 
                and support to our community members. Every contribution makes a difference.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="border border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors cursor-pointer">
                <div className="text-2xl font-bold text-blue-600 mb-2">$25</div>
                <div className="font-medium text-gray-900 mb-2">Supporter</div>
                <div className="text-sm text-gray-600">Help fund community events and resources</div>
              </div>
              
              <div className="border border-blue-300 bg-blue-50 rounded-lg p-6 text-center cursor-pointer">
                <div className="text-2xl font-bold text-blue-600 mb-2">$50</div>
                <div className="font-medium text-gray-900 mb-2">Advocate</div>
                <div className="text-sm text-gray-600">Support mentorship programs and workshops</div>
                <div className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mt-2">
                  Most Popular
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors cursor-pointer">
                <div className="text-2xl font-bold text-blue-600 mb-2">$100</div>
                <div className="font-medium text-gray-900 mb-2">Champion</div>
                <div className="text-sm text-gray-600">Fund scholarships and career development</div>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500">$</span>
                <input
                  type="number"
                  placeholder="Enter amount"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium">
                Donate Now
              </button>
              <button className="flex-1 border border-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-50 font-medium">
                Set up Monthly Giving
              </button>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Donate?</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✅</span>
                <div>
                  <div className="font-medium text-gray-900">Community Events</div>
                  <div className="text-sm text-gray-600">Fund networking events and meetups</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✅</span>
                <div>
                  <div className="font-medium text-gray-900">Educational Resources</div>
                  <div className="text-sm text-gray-600">Support workshops and training programs</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✅</span>
                <div>
                  <div className="font-medium text-gray-900">Mentorship Programs</div>
                  <div className="text-sm text-gray-600">Connect members with industry professionals</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-500 mt-1">✅</span>
                <div>
                  <div className="font-medium text-gray-900">Platform Maintenance</div>
                  <div className="text-sm text-gray-600">Keep our platform running and improving</div>
                </div>
              </div>
            </div>
          </div>
      </div>
    </PageLayout>
  );
}
