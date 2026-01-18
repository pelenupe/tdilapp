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
  const [showPostForm, setShowPostForm] = useState(false);
  const [posting, setPosting] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    location: '',
    salary: '',
    jobType: 'full-time',
    description: '',
    requirements: '',
    contactEmail: ''
  });

  // Load user data from localStorage
  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      setUser({
        userType: userData.userType || 'member',
        id: userData.id
      });
      setUserPoints(userData.points || 0);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/jobs');
      
      if (response.ok) {
        const data = await response.json();
        const transformedJobs = data.map(job => ({
          id: job.id,
          title: job.title || 'Position Available',
          company: job.company || 'tDIL Partner Company',
          location: job.location || 'Indianapolis, IN',
          type: job.jobType || job.job_type || 'Full-time',
          salary: job.salary || 'Competitive',
          description: job.description || 'Join our team and make an impact.',
          requirements: job.requirements ? job.requirements.split(',').map(r => r.trim()) : ['Experience in relevant field'],
          benefits: job.benefits ? job.benefits.split(',').map(b => b.trim()) : ['Competitive benefits package'],
          postedDate: job.createdAt ? new Date(job.createdAt).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }) : 'Recently posted',
          postedBy: job.postedBy,
          postedByName: job.postedByName,
          category: job.category || 'general'
        }));
        setJobs(transformedJobs);
      } else {
        console.error('Failed to fetch jobs');
        setJobs([]);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handlePostJob = async (e) => {
    e.preventDefault();
    
    try {
      setPosting(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Please log in to post a job');
        return;
      }

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newJob)
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Job posted successfully! You earned points for sharing an opportunity!`);
        setShowPostForm(false);
        setNewJob({
          title: '',
          company: '',
          location: '',
          salary: '',
          jobType: 'full-time',
          description: '',
          requirements: '',
          contactEmail: ''
        });
        // Refresh jobs list
        fetchJobs();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to post job');
      }
    } catch (error) {
      console.error('Error posting job:', error);
      alert('Failed to post job. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Job deleted successfully');
        fetchJobs();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to delete job');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleApply = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    
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
    if (filter === 'my-jobs') return job.postedBy === user.id;
    if (filter === 'full-time') return job.type.toLowerCase() === 'full-time';
    if (filter === 'contract') return job.type.toLowerCase() === 'contract';
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

  const headerContent = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
            onClick={() => setFilter('my-jobs')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filter === 'my-jobs' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            My Posts
          </button>
          <button
            onClick={() => setFilter('applied')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              filter === 'applied' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Applied ({appliedJobs.size})
          </button>
        </div>
        <button
          onClick={() => setShowPostForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
        >
          <span>➕</span> Post a Job
        </button>
      </div>
    </div>
  );

  return (
    <PageLayout
      userType={user.userType}
      title="Job Board"
      subtitle="Discover career opportunities from tDIL partner companies"
      userPoints={userPoints}
      headerContent={headerContent}
    >
      {/* Post Job Modal */}
      {showPostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Post a New Job</h2>
              <button onClick={() => setShowPostForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
            </div>
            
            <form onSubmit={handlePostJob} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  value={newJob.title}
                  onChange={(e) => setNewJob({...newJob, title: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Software Engineer"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={newJob.company}
                    onChange={(e) => setNewJob({...newJob, company: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newJob.location}
                    onChange={(e) => setNewJob({...newJob, location: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Indianapolis, IN"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    type="text"
                    value={newJob.salary}
                    onChange={(e) => setNewJob({...newJob, salary: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $80,000 - $100,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                  <select
                    value={newJob.jobType}
                    onChange={(e) => setNewJob({...newJob, jobType: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="full-time">Full-time</option>
                    <option value="part-time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newJob.description}
                  onChange={(e) => setNewJob({...newJob, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Describe the role and responsibilities..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requirements (comma separated)</label>
                <textarea
                  value={newJob.requirements}
                  onChange={(e) => setNewJob({...newJob, requirements: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="e.g., 3+ years experience, Bachelor's degree, Python skills"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                <input
                  type="email"
                  value={newJob.contactEmail}
                  onChange={(e) => setNewJob({...newJob, contactEmail: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="jobs@company.com"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPostForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={posting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {posting ? 'Posting...' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {filteredJobs.map((job) => (
          <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold text-gray-900">{job.title}</h2>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    job.type.toLowerCase() === 'full-time' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {job.type}
                  </span>
                  {job.postedBy === user.id && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Your Post
                    </span>
                  )}
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

            {job.requirements.length > 0 && job.requirements[0] && (
              <div className="mb-6">
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
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                {job.postedByName && <span>Posted by {job.postedByName} · </span>}
                Earn <span className="font-semibold text-blue-600">+100 points</span> for applying
              </div>
              <div className="flex gap-3">
                {job.postedBy === user.id && (
                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={() => handleApply(job.id)}
                  disabled={appliedJobs.has(job.id) || job.postedBy === user.id}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors text-sm ${
                    appliedJobs.has(job.id)
                      ? 'bg-green-100 text-green-800 cursor-not-allowed'
                      : job.postedBy === user.id
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {appliedJobs.has(job.id) ? '✓ Applied' : job.postedBy === user.id ? 'Your Job' : 'Apply Now'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredJobs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
          <p className="text-gray-600 mb-4">Be the first to post a job opportunity!</p>
          <button
            onClick={() => setShowPostForm(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Post a Job
          </button>
        </div>
      )}
    </PageLayout>
  );
}
