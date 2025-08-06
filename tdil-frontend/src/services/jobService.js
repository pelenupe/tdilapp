import API from './api';

export const getJobs = () => API.get('/jobs');
export const postJob = (jobData) => API.post('/jobs', jobData);
export const applyJob = (jobId) => API.post('/jobs/apply', { jobId });
export const getMyApplications = () => API.get('/jobs/applications');
