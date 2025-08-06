import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SidebarMember from '../components/SidebarMember';
import SidebarPartnerSchool from '../components/SidebarPartnerSchool';
import SidebarSponsor from '../components/SidebarSponsor';
import MobileHeader from '../components/MobileHeader';

export default function PartnerSchools() {
  const [schools, setSchools] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ userType: 'member' });

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser({
        userType: userData.userType || 'member'
      });
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    // Mock partner schools data
    const mockSchools = [
      {
        id: 1,
        name: 'Indiana University',
        location: 'Bloomington, IN',
        type: 'Public University',
        logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop',
        description: 'Leading research university with strong business and technology programs.',
        programs: ['Business', 'Computer Science', 'Engineering', 'Data Science'],
        students: 1250,
        partnership: 'Premium',
        benefits: ['Career fairs', 'Mentorship programs', 'Internship opportunities', 'Guest lectures'],
        website: 'https://www.iu.edu',
        featured: true
      },
      {
        id: 2,
        name: 'Purdue University',
        location: 'West Lafayette, IN',
        type: 'Public University',
        logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=200&h=200&fit=crop',
        description: 'World-renowned engineering and technology university.',
        programs: ['Engineering', 'Computer Science', 'Aviation', 'Business'],
        students: 980,
        partnership: 'Premium',
        benefits: ['Research partnerships', 'Co-op programs', 'Alumni network', 'Innovation labs'],
        website: 'https://www.purdue.edu',
        featured: true
      },
      {
        id: 3,
        name: 'Butler University',
        location: 'Indianapolis, IN',
        type: 'Private University',
        logo: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=200&h=200&fit=crop',
        description: 'Private university known for business and liberal arts excellence.',
        programs: ['Business', 'Liberal Arts', 'Education', 'Health Sciences'],
        students: 450,
        partnership: 'Standard',
        benefits: ['Networking events', 'Career counseling', 'Job placement', 'Alumni connections'],
        website: 'https://www.butler.edu',
        featured: false
      },
      {
        id: 4,
        name: 'IUPUI',
        location: 'Indianapolis, IN',
        type: 'Public University',
        logo: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=200&h=200&fit=crop',
        description: 'Urban research university combining IU and Purdue strengths.',
        programs: ['Medicine', 'Engineering', 'Business', 'Public Health'],
        students: 720,
        partnership: 'Premium',
        benefits: ['Clinical partnerships', 'Research opportunities', 'Urban internships', 'Healthcare network'],
        website: 'https://www.iupui.edu',
        featured: true
      },
      {
        id: 5,
        name: 'DePauw University',
        location: 'Greencastle, IN',
        type: 'Private Liberal Arts',
        logo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop',
        description: 'Prestigious liberal arts college with strong alumni network.',
        programs: ['Liberal Arts', 'Business', 'Music', 'Communications'],
        students: 280,
        partnership: 'Standard',
        benefits: ['Liberal arts focus', 'Small class sizes', 'Personal mentoring', 'Alumni network'],
        website: 'https://www.depauw.edu',
        featured: false
      }
    ];

    setSchools(mockSchools);
    setLoading(false);
  }, []);

  const filteredSchools = schools.filter(school => {
    if (filter === 'all') return true;
    if (filter === 'featured') return school.featured;
    if (filter === 'premium') return school.partnership === 'Premium';
    if (filter === 'public') return school.type.includes('Public');
    if (filter === 'private') return school.type.includes('Private');
    return true;
  });

  // Render appropriate sidebar based on user type
  const renderSidebar = () => {
    switch (user.userType) {
      case 'partner_school':
        return <SidebarPartnerSchool />;
      case 'sponsor':
        return <SidebarSponsor />;
      default:
        return <SidebarMember />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MobileHeader userType={user.userType} />
        {renderSidebar()}
        <div className="transition-all duration-300 lg:ml-64 pt-16 lg:pt-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading partner schools...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader userType={user.userType} />
      {renderSidebar()}
      
      <div className="transition-all duration-300 lg:ml-64 pt-16 lg:pt-0">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Partner Schools</h1>
              <p className="text-gray-600">Connect with {schools.length} partner educational institutions</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span className="font-bold text-gray-900">2,450 points</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All Schools ({schools.length})
            </button>
            <button
              onClick={() => setFilter('featured')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'featured' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Featured ({schools.filter(s => s.featured).length})
            </button>
            <button
              onClick={() => setFilter('premium')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'premium' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Premium Partners ({schools.filter(s => s.partnership === 'Premium').length})
            </button>
            <button
              onClick={() => setFilter('public')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'public' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Public ({schools.filter(s => s.type.includes('Public')).length})
            </button>
            <button
              onClick={() => setFilter('private')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'private' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              Private ({schools.filter(s => s.type.includes('Private')).length})
            </button>
          </div>

          {/* Schools Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSchools.map((school) => (
              <div key={school.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 mb-4">
                  <img src={school.logo} alt={school.name} className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{school.name}</h3>
                        <p className="text-sm text-gray-600">{school.location}</p>
                        <p className="text-sm text-blue-600 font-medium">{school.type}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          school.partnership === 'Premium' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {school.partnership}
                        </span>
                        {school.featured && (
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                            Featured
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-gray-600 mb-4">{school.description}</p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                    </svg>
                    {school.students.toLocaleString()} tDIL members
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Key Programs</h4>
                    <div className="flex flex-wrap gap-1">
                      {school.programs.map((program, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {program}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Partnership Benefits</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {school.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-center gap-1 text-xs text-gray-600">
                          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                    View Members
                  </button>
                  <a 
                    href={school.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.148.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd"/>
                    </svg>
                    Website
                  </a>
                </div>
              </div>
            ))}
          </div>

          {filteredSchools.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No schools found</h3>
              <p className="text-gray-600">Try adjusting your filters to see more partner schools.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
