import { useEffect, useState } from 'react';
import PageLayout from '../components/PageLayout';
import PointsService from '../services/pointsService';

export default function JobBoard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobs, setAppliedJobs] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [user, setUser] = useState({ userType: 'member' });
  const [userPoints, setUserPoints] = useState(0);

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser({
        userType: userData.userType || 'member'
      });
      setUserPoints(userData.points || 0);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  useEffect(() => {
    // Fetch real jobs from API
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/jobs');
        
        if (response.ok) {
          const data = await response.json();
          // Transform data to match frontend format
          const transformedJobs = data.map(job => ({
            id: job.id,
            title: job.title || 'Position Available',
            company: job.company || 'tDIL Partner Company',
            location: job.location || 'Indianapolis, IN',
            type: job.job_type || 'Full-time',
            salary: job.salary || 'Competitive',
            description: job.description || 'Join our team and make an impact.',
            requirements: job.requirements ? job.requirements.split(',').map(r => r.trim()) : ['Experience in relevant field'],
            benefits: job.benefits ? job.benefits.split(',').map(b => b.trim()) : ['Competitive benefits package'],
            postedDate: job.created_at ? new Date(job.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            }) : 'Recently posted',
            category: job.category || 'general'
          }));
          setJobs(transformedJobs);
        } else {
          console.error('Failed to fetch jobs');
          setJobs([]); // Show empty state instead of fake data
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        setJobs([]); // Show empty state instead of fake data
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const handleApply = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    
    // Award points for job application
    PointsService.awardPoints('JOB_APPLICATION', `Applied for ${job.title} at ${job.company}`, {
      jobId,
      jobTitle: job.title,
      company: job.company
    });
    
    setAppliedJobs(prev => new Set(prev).add(jobId));
    setUserPoints(prev => prev + 100);
    alert(`Successfully applied to ${job.title} at ${job.company}! You earned 100 points!`);
  };

  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true;
    if (filter === 'applied') return appliedJobs.has(job.id);
    if (filter === 'full-time') return job.type === 'Full-time';
    if (filter === 'contract') return job.type === 'Contract';
    return job.category === filter;
  });

  if (loading) {
    return (
      <PageLayout
        userType={user.userType}
        title="Job Board"
        subtitle="Loading opportunities..."
        showPointsInHeader={false}
      >
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs mb-4 mx-auto">
              tDIL
            </div>
            <div className="text-gray-600">Loading jobs...</div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const filterButtons = (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setFilter('all')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        All Jobs ({jobs.length})
      </button>
      <button
        onClick={() => setFilter('applied')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'applied' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Applied ({appliedJobs.size})
      </button>
      <button
        onClick={() => setFilter('full-time')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'full-time' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Full-time ({jobs.filter(j => j.type === 'Full-time').length})
      </button>
      <button
        onClick={() => setFilter('engineering')}
        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
          filter === 'engineering' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
        }`}
      >
        Engineering ({jobs.filter(j => j.category === 'engineering').length})
      </button>
    </div>
  );

  return (
    <PageLayout
      userType={user.userType}
      title="Job Board"
      subtitle="Discover career opportunities from tDIL partner companies"
      userPoints={userPoints}
      headerContent={filterButtons}
    >
      <div className="space-y-6">
        {filteredJobs.map((job) => (
          <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    job.type === 'Full-time' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {job.type}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <span>🏢</span>
                    <span className="font-medium">{job.company}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>📍</span>
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>💰</span>
                    <span className="font-semibold text-green-600">{job.salary}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>🕒</span>
                    <span>{job.postedDate}</span>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{job.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Requirements</h4>
                <ul className="space-y-2">
                  {job.requirements.map((req, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-1 flex-shrink-0">✓</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Benefits</h4>
                <ul className="space-y-2">
                  {job.benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-blue-500 mt-1 flex-shrink-0">✓</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Earn <span className="font-semibold text-blue-600">+100 points</span> for applying
              </div>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Save Job
                </button>
                <button
                  onClick={() => handleApply(job.id)}
                  disabled={appliedJobs.has(job.id)}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors text-sm ${
                    appliedJobs.has(job.id)
                      ? 'bg-green-100 text-green-800 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {appliedJobs.has(job.id) ? '✓ Applied' : 'Apply Now'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No results state */}
      {filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600">Try adjusting your filters to see more opportunities.</p>
        </div>
      )}
    </PageLayout>
  );
}
